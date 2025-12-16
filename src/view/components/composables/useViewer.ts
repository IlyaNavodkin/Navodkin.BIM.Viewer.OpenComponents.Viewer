import { computed, shallowRef } from "vue";
import * as OBC from "@thatopen/components";
import { FragmentsModel, LodMode } from "@thatopen/fragments";
import * as THREE from "three";

export const useViewer = () => {
  const container = shallowRef<HTMLDivElement | undefined>(undefined);
  const components = shallowRef<OBC.Components | undefined>(undefined);
  const ifcLoader = shallowRef<OBC.IfcLoader | undefined>(undefined);
  const loadedModels = shallowRef<FragmentsModel[]>([]);
  const words = shallowRef<OBC.Worlds | undefined>(undefined);
  const currentWord = shallowRef<
    | OBC.SimpleWorld<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>
    | undefined
  >(undefined);
  const fragmentManager = shallowRef<OBC.FragmentsManager | undefined>(
    undefined
  );
  const hider = shallowRef<OBC.Hider | undefined>(undefined);
  const views = shallowRef<OBC.Views | undefined>(undefined);
  const workerUrl = shallowRef<string | undefined>(undefined);
  const isLoading = shallowRef(false);
  const loadingProgress = shallowRef(0);
  const selectedElement = shallowRef<{
    localId: number;
    distance: number;
    point: THREE.Vector3;
  } | null>(null);

  const handleFileChange = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const path = URL.createObjectURL(file);
      await loadIfc(path, file.name);

      if (!views.value) throw new Error("Views is null");
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

      // Создаем виды для всех моделей (не передаем modelIds)
      // или можно использовать имя конкретной модели: { modelIds: [new RegExp(modelName, 'i')] }
      await views.value.createFromIfcStoreys();

      // Обновляем список видов
      updateFunction();
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

      loadedModels.value.push(model);
      loadingProgress.value = 100;

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
      OBC.SimpleRenderer
    >();
    currentWord.value = world;

    const componentsInstance = components.value;
    const containerInstance = container.value;
    if (!componentsInstance || !containerInstance) {
      throw new Error("Components or container is null");
    }

    const scene = new OBC.SimpleScene(componentsInstance as OBC.Components);
    const render = new OBC.SimpleRenderer(
      componentsInstance as OBC.Components,
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

    const grids = components.value.get(OBC.Grids);
    const grid = grids.create(world);

    grid.config.color.set(0x888888);

    components.value.init();

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

    // Инициализация Views
    views.value = components.value.get(OBC.Views);
    views.value.world = world;

    // НЕ создаем виды здесь, так как модели еще не загружены
    // Виды будут созданы после загрузки модели в handleFileChange
    views.value.list.onItemSet.add(updateFunction);
    views.value.list.onItemDeleted.add(updateFunction);
    views.value.list.onItemUpdated.add(updateFunction);
    views.value.list.onCleared.add(updateFunction);
    fragmentManager.value.list.onItemSet.add(({ value: model }) => {
      if (!currentWord.value) throw new Error("Word is not exists");

      model.useCamera(currentWord.value.camera.three);
      currentWord.value.scene.three.add(model.object);
      fragmentManager.value!.core.update(true);
    });
  };

  const updateFunction = () => {
    viewsList.value = [];
    views.value?.list.forEach((view, key) => {
      // Вычисляем distance и range на основе плоскостей вида
      if (view.plane && view.farPlane) {
        const planeLevel = view.plane.constant;
        const farPlaneLevel = view.farPlane.constant;

        console.log(
          "name: ",
          key,
          "planeLevel",
          planeLevel,
          "farPlaneLevel",
          farPlaneLevel
        );

        const planeIsPositive = planeLevel > 0;

        const distance = (farPlaneLevel - planeLevel) / 2;

        // distance - это уровень плоскости вида (глубина камеры)

        // range - это дальность видимости (положительное значение)
        // Вычисляем как разницу между дальней плоскостью и плоскостью вида
        view.range = planeIsPositive ? Math.abs(distance) : -Math.abs(distance);

        view.distance = planeLevel + distance;
      }
      // Добавляем в список
      viewsList.value.push([key, view]);
    });
  };

  const disposeViewer = () => {
    try {
      // Очищаем все загруженные модели
      if (loadedModels.value) {
        loadedModels.value.forEach((model) => {
          try {
            // Удаляем модель из сцены, если она была добавлена
            if (currentWord.value?.scene?.three && model.object) {
              currentWord.value.scene.three.remove(model.object);
            }
            // Освобождаем ресурсы модели, если есть метод dispose
            if (typeof model.dispose === "function") {
              model.dispose();
            }
          } catch (error) {
            console.warn("Ошибка при освобождении модели:", error);
          }
        });
        loadedModels.value = [];
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
      views.value = undefined;
    } catch (error) {
      console.error("Ошибка при освобождении ресурсов viewer:", error);
    }
  };

  const modelNames = computed(() => {
    if (!fragmentManager.value?.list) return "";

    const names: string[] = [];
    fragmentManager.value.list.forEach((_, name) => {
      names.push(name);
    });

    return names.join(", ");
  });

  const viewsList = shallowRef<[string, OBC.View][]>([]);

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

  return {
    container,
    components,
    ifcLoader,
    loadedModels,
    words,
    currentWord,
    fragmentManager,
    hider,
    views,
    viewsList,
    workerUrl,
    isLoading,
    loadingProgress,
    selectedElement,
    modelNames,
    getElementInfo,
    setSelectedElement,
    handleFileChange,
    setupViewer,
    disposeViewer,
    consoleToElements,
  };
};
