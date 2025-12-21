import { shallowRef, ref } from "vue";
import * as OBC from "@thatopen/components";
import { FragmentsModel, LodMode } from "@thatopen/fragments";
import * as THREE from "three";
import { useDataAccess, type LevelsViewData } from "./useDataAccess";
import * as OBF from "@thatopen/components-front";
import { useViews } from "./useViews";
import { useSelection } from "./useSelection";
import * as FRAGS from "@thatopen/fragments";
import { useMarkers } from "./useMarkers";
import { useTableSelection } from "./useTableSelection";
import { useClipStyler as useClipper } from "./useClip";
import { PostproductionAspect } from "@thatopen/components-front";

export interface ElementData {
  Name: string | null;
  LocalId: number;
  Tag: string | null;
  ObjectType: string | null;
  Category: string | null;
  Comments: string | null;
}

export const useViewer = () => {
  const { getLevels, getEntityByLocalId } = useDataAccess();
  const container = shallowRef<HTMLDivElement | undefined>(undefined);
  const components = shallowRef<OBC.Components | undefined>(undefined);
  const ifcLoader = shallowRef<OBC.IfcLoader | undefined>(undefined);
  const currentModel = shallowRef<FragmentsModel | undefined>(undefined);
  const words = shallowRef<OBC.Worlds | undefined>(undefined);
  const currentWord = shallowRef<
    | OBC.SimpleWorld<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>
    | undefined
  >(undefined);
  const fragmentManager = shallowRef<OBC.FragmentsManager | undefined>(
    undefined
  );
  const hider = shallowRef<OBC.Hider | undefined>(undefined);
  const workerUrl = shallowRef<string | undefined>(undefined);
  const isLoading = shallowRef(false);
  const finder = shallowRef<OBC.ItemsFinder | undefined>(undefined);
  const loadingProgress = shallowRef(0);
  const selectedElement = shallowRef<{
    localId: number;
    distance: number;
    point: THREE.Vector3;
  } | null>(null);

  const viewsState = shallowRef<ReturnType<typeof useViews> | undefined>(
    undefined
  );

  const markersState = shallowRef<ReturnType<typeof useMarkers> | undefined>(
    undefined
  );

  const selectionState = shallowRef<
    ReturnType<typeof useSelection> | undefined
  >(undefined);

  const tableSelectionState = shallowRef<
    ReturnType<typeof useTableSelection> | undefined
  >(undefined);

  const clipperState = shallowRef<ReturnType<typeof useClipper> | undefined>(
    undefined
  );
  const filteredElements = ref<ElementData[]>([]);
  const isLoadingElements = ref(false);

  const levelsData = ref<LevelsViewData[]>([]);
  const isLoadingLevels = ref(false);

  const handleFileChange = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const path = URL.createObjectURL(file);
      await loadIfc(path, file.name);

      if (!viewsState.value?.views) throw new Error("Views is null");
      if (!fragmentManager.value) throw new Error("FragmentManager is null");

      // Проверяем, что модель была добавлена в fragmentManager
      // Модель добавляется автоматически при загрузке через IfcLoader
      const modelName = file.name; // Имя модели в fragmentManager - это имя файла
      const modelExists = fragmentManager.value.list.has(modelName);

      if (!modelExists) {
        console.warn(
          `Модель "${modelName}" не найдена в fragmentManager. Доступные модели:`,
          Array.from(fragmentManager.value.list.keys())
        );
        return;
      }
    }
  };

  /**
   * Загружает уровни (IfcBuildingStorey) из модели
   */
  const loadLevelsData = async (model: FragmentsModel) => {
    try {
      isLoadingLevels.value = true;
      levelsData.value = [];

      const levels = await getLevels(model);
      levelsData.value = levels.sort((a, b) => a.elevation - b.elevation);

      console.log(`Загружено уровней: ${levelsData.value.length}`);
    } catch (error) {
      console.error("Ошибка при загрузке уровней:", error);
      levelsData.value = [];
    } finally {
      isLoadingLevels.value = false;
    }
  };

  const toggleLevelClip = (levelName: string) => {
    if (!currentWord.value) return;

    clipperState.value?.clearAll();

    const normal = new THREE.Vector3(0, -1, 0);
    const elevationValue = levelsData.value.find(
      (level) => level.name === levelName
    )?.elevation;
    if (!elevationValue) return;
    const point = new THREE.Vector3(0, elevationValue, 0);

    clipperState.value?.clipper.value?.createFromNormalAndCoplanarPoint(
      currentWord.value!,
      normal,
      point
    );
    console.log(`Клип уровня "${levelName}" переключен`);
  };

  /**
   * Загружает элементы IFCFURNISHINGELEMENT с фильтром по наличию непустого свойства Comments
   */
  const loadFilteredElements = async (model: FragmentsModel) => {
    try {
      isLoadingElements.value = true;
      filteredElements.value = [];

      // Получаем элементы категории IFCFURNISHINGELEMENT
      const furnishingItems = await model.getItemsOfCategories([
        /IFCFURNISHINGELEMENT/,
      ]);
      const furnishingIds = Object.values(furnishingItems).flat();

      if (furnishingIds.length === 0) {
        filteredElements.value = [];
        isLoadingElements.value = false;
        return;
      }

      // Получаем данные элементов с property sets
      const itemsData = await model.getItemsData(furnishingIds, {
        attributesDefault: true,
        relations: {
          IsDefinedBy: { attributes: true, relations: true },
          DefinesOcurrence: { attributes: false, relations: false },
        },
      });

      const filtered: ElementData[] = [];

      for (let i = 0; i < itemsData.length; i++) {
        const itemData = itemsData[i];
        const localId = furnishingIds[i];

        // Проверяем наличие свойства Comments с непустым значением
        if (itemData.IsDefinedBy && Array.isArray(itemData.IsDefinedBy)) {
          const psets = itemData.IsDefinedBy as FRAGS.ItemData[];
          let hasNonEmptyComments = false;
          let commentsValue: string | null = null;

          // Ищем свойство Comments в любом Property Set
          for (const pset of psets) {
            const { HasProperties } = pset;

            if (Array.isArray(HasProperties)) {
              for (const prop of HasProperties) {
                const { Name, NominalValue } = prop;
                if (
                  "value" in Name &&
                  Name.value === "Comments" &&
                  "value" in NominalValue
                ) {
                  const value = NominalValue.value;
                  // Проверяем, что значение не пустое (не null, не undefined, не пустая строка)
                  if (
                    value !== null &&
                    value !== undefined &&
                    String(value).trim() !== ""
                  ) {
                    commentsValue = String(value).trim();
                    hasNonEmptyComments = true;
                    break;
                  }
                }
              }
            }

            if (hasNonEmptyComments) break;
          }

          // Добавляем элемент только если есть непустое свойство Comments
          if (hasNonEmptyComments) {
            // Извлекаем данные элемента
            const nameAttr = itemData.Name as FRAGS.ItemAttribute;
            const tagAttr = itemData.Tag as FRAGS.ItemAttribute;
            const objectTypeAttr = itemData.ObjectType as FRAGS.ItemAttribute;
            const categoryAttr = itemData._category as FRAGS.ItemAttribute;

            filtered.push({
              Name:
                nameAttr && "value" in nameAttr
                  ? (nameAttr.value as string | null)
                  : null,
              LocalId: localId,
              Tag:
                tagAttr && "value" in tagAttr
                  ? (tagAttr.value as string | null)
                  : null,
              ObjectType:
                objectTypeAttr && "value" in objectTypeAttr
                  ? (objectTypeAttr.value as string | null)
                  : null,
              Category:
                categoryAttr && "value" in categoryAttr
                  ? (categoryAttr.value as string | null)
                  : null,
              Comments: commentsValue,
            });
          }
        }
      }

      filteredElements.value = filtered;
      console.log(`Загружено элементов: ${filtered.length}`);
    } catch (error) {
      console.error("Ошибка при загрузке элементов:", error);
      filteredElements.value = [];
    } finally {
      isLoadingElements.value = false;
    }
  };

  const loadIfc = async (path: string, name: string) => {
    if (!ifcLoader.value) return;

    try {
      isLoading.value = true;
      loadingProgress.value = 0;

      const getFileResponse = await fetch(path);

      const data = await getFileResponse.arrayBuffer();
      const buffer = new Uint8Array(data);

      const model = await ifcLoader.value.load(buffer, true, name, {
        processData: {
          progressCallback: (progress: any) => {
            if (typeof progress === "number") {
              loadingProgress.value = Math.min(100, Math.max(0, progress));
            } else if (progress && typeof progress === "object") {
              const progressValue =
                (progress as any).progress ??
                (progress as any).percentage ??
                (progress as any).value ??
                0;
              loadingProgress.value = Math.min(100, Math.max(0, progressValue));
            }
            console.log("Progress:", loadingProgress.value);
          },
        },
      });

      model.setLodMode(LodMode.ALL_VISIBLE);

      currentModel.value = model;
      loadingProgress.value = 100;

      const levelsData = await getLevels(model);
      await viewsState.value?.createViewsFromLevels(levelsData);

      // Загружаем отфильтрованные элементы после загрузки модели
      await loadFilteredElements(model);

      // Загружаем уровни после загрузки модели
      await loadLevelsData(model);

      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error("Ошибка при загрузке модели:", error);
      throw error;
    } finally {
      isLoading.value = false;
      setTimeout(() => {
        loadingProgress.value = 0;
      }, 300);
    }
  };

  const setupViewer = async (existingContainer: HTMLDivElement) => {
    if (!existingContainer) throw new Error("Existing container is null");

    container.value = existingContainer;
    components.value = new OBC.Components();

    if (!components.value) throw new Error("Components is null");

    words.value = components.value.get(OBC.Worlds);
    const world = words.value.create<
      OBC.SimpleScene,
      OBC.SimpleCamera,
      OBF.PostproductionRenderer
    >();
    currentWord.value = world;

    const componentsInstance = components.value;
    const containerInstance = container.value;
    if (!componentsInstance || !containerInstance) {
      throw new Error("Components or container is null");
    }

    const scene = new OBC.SimpleScene(componentsInstance as OBC.Components);
    const render = new OBF.PostproductionRenderer(
      componentsInstance,
      containerInstance
    );

    const camera = new OBC.SimpleCamera(componentsInstance as OBC.Components);

    if (!render || !camera) {
      throw new Error("Failed to create renderer or camera");
    }

    world.scene = scene;
    world.renderer = render;
    world.camera = camera;

    scene.setup();

    // const grids = components.value.get(OBC.Grids);
    // const grid = grids.create(world);

    // grid.config.color.set(0x888888);

    components.value.init();

    // Включаем postproduction перед установкой стиля
    // Согласно документации, postproduction должен быть enabled перед установкой style
    render.postproduction.enabled = true;
    render.postproduction.style = PostproductionAspect.PEN_SHADOWS;

    ifcLoader.value = components.value.get(OBC.IfcLoader);

    ifcLoader.value.onIfcImporterInitialized.add((importer) => {
      console.log(importer.classes);
    });

    await ifcLoader.value.setup({
      autoSetWasm: false,
      wasm: {
        path: "https://unpkg.com/web-ifc@0.0.72/",
        absolute: true,
      },
      webIfc: {
        COORDINATE_TO_ORIGIN: false,
      },
    });

    const githubUrl =
      "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
    const fetchedUrl = await fetch(githubUrl);
    const workerBlob = await fetchedUrl.blob();
    const workerFile = new File([workerBlob], "worker.mjs", {
      type: "text/javascript",
    });
    const createdWorkerUrl = URL.createObjectURL(workerFile);
    workerUrl.value = createdWorkerUrl;

    fragmentManager.value = components.value.get(OBC.FragmentsManager);
    fragmentManager.value.init(createdWorkerUrl);

    hider.value = components.value.get(OBC.Hider);
    finder.value = components.value.get(OBC.ItemsFinder);
    viewsState.value = useViews(components.value, world);

    // Инициализация selection (highlighter) для автоматического выделения при клике
    selectionState.value = useSelection(components.value, world);

    markersState.value = useMarkers(components.value, world);

    // Инициализация table selection для управления выбором столов
    tableSelectionState.value = useTableSelection(
      currentModel,
      currentWord,
      components,
      markersState,
      selectionState
    );

    // Инициализация clip styler для 3D клиппера
    clipperState.value = useClipper(components.value, world);

    // Получаем Raycasters для автоматического выделения при клике
    // Raycaster автоматически будет вызывать highlighter при клике
    components.value.get(OBC.Raycasters).get(world);
    console.log("Автоматическое выделение настроено");

    fragmentManager.value.list.onItemSet.add(({ value: model }) => {
      if (!currentWord.value) throw new Error("Word is not exists");

      model.useCamera(currentWord.value.camera.three);
      currentWord.value.scene.three.add(model.object);
      fragmentManager.value!.core.update(true);
    });
  };

  const disposeViewer = () => {
    try {
      // Очищаем все загруженные модели
      if (currentModel.value) {
        currentModel.value.dispose();
        currentModel.value = undefined;
      }

      // Удаляем обработчики событий
      if (ifcLoader.value?.onIfcImporterInitialized) {
        ifcLoader.value.onIfcImporterInitialized.reset();
      }

      if (fragmentManager.value?.list?.onItemSet) {
        fragmentManager.value.list.onItemSet.reset();
      }

      // Освобождаем worker URL
      if (workerUrl.value) {
        try {
          URL.revokeObjectURL(workerUrl.value);
        } catch (error) {
          console.warn("Ошибка при освобождении worker URL:", error);
        }
        workerUrl.value = undefined;
      }

      // Очищаем world, если есть метод dispose
      if (currentWord.value) {
        try {
          if (typeof currentWord.value.dispose === "function") {
            currentWord.value.dispose();
          }
        } catch (error) {
          console.warn("Ошибка при освобождении world:", error);
        }
      }

      // Очищаем fragmentManager
      if (fragmentManager.value) {
        try {
          if (typeof fragmentManager.value.dispose === "function") {
            fragmentManager.value.dispose();
          }
        } catch (error) {
          console.warn("Ошибка при освобождении fragmentManager:", error);
        }
      }

      // Очищаем components (это должно освободить все остальные ресурсы)
      if (components.value) {
        try {
          components.value.dispose();
        } catch (error) {
          console.warn("Ошибка при освобождении components:", error);
        }
      }

      container.value = undefined;
      components.value = undefined;
      ifcLoader.value = undefined;
      words.value = undefined;
      currentWord.value = undefined;
      fragmentManager.value = undefined;
      hider.value = undefined;
      viewsState.value = undefined;
      selectionState.value = undefined;
      markersState.value = undefined;
      tableSelectionState.value = undefined;
      clipperState.value = undefined;
      filteredElements.value = [];
    } catch (error) {
      console.error("Ошибка при освобождении ресурсов viewer:", error);
    }
  };

  const consoleToElements = async (model: FragmentsModel) => {
    const elements = await model.getSpatialStructure();

    console.log(elements);
  };

  const getElementInfo = async (
    model: FragmentsModel,
    localId: number
  ): Promise<any> => {
    try {
      const itemsData = await model.getItemsData([localId], {
        attributesDefault: false,
        attributes: ["Name", "GlobalId", "Tag", "ObjectType"],
      });

      if (itemsData && itemsData.length > 0) {
        return itemsData[0];
      }
      return null;
    } catch (error) {
      console.error("Ошибка при получении информации об элементе:", error);
      return null;
    }
  };

  const setSelectedElement = (
    element: { localId: number; distance: number; point: THREE.Vector3 } | null
  ) => {
    selectedElement.value = element;
  };

  const selectEmployeePlacement = async (localId: number) => {
    await tableSelectionState.value?.selectTable(localId);
  };

  return {
    container,
    components,
    ifcLoader,
    loadedModel: currentModel,
    words,
    currentWord,
    fragmentManager,
    hider,
    viewsState,
    markersState,
    selectionState,
    tableSelectionState,
    clipperState,
    filteredElements,
    isLoadingElements,
    levelsData,
    isLoadingLevels,
    workerUrl,
    isLoading,
    loadingProgress,
    selectedElement,
    getElementInfo,
    setSelectedElement,
    selectEmployeePlacement,
    handleFileChange,
    setupViewer,
    disposeViewer,
    consoleToElements,
    toggleLevelClip,
  };
};
