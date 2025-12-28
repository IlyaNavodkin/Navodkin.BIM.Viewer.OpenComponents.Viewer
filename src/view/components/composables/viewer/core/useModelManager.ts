import { ref, shallowRef, type Ref } from "vue";
import * as OBC from "@thatopen/components";
import { FragmentsModel, LodMode } from "@thatopen/fragments";

/**
 * Менеджер моделей для загрузки и выгрузки IFC моделей
 * Отвечает за управление текущей моделью и состоянием загрузки
 */
export const useModelManager = (
  components: Ref<OBC.Components | undefined>,
  workerUrl: Ref<string | undefined>,
  currentWord: Ref<
    | OBC.SimpleWorld<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>
    | undefined
  >
) => {
  const ifcLoader = shallowRef<OBC.IfcLoader | undefined>(undefined);
  const currentModel = shallowRef<FragmentsModel | undefined>(undefined);
  const fragmentManager = shallowRef<OBC.FragmentsManager | undefined>(
    undefined
  );
  const hider = shallowRef<OBC.Hider | undefined>(undefined);
  const finder = shallowRef<OBC.ItemsFinder | undefined>(undefined);
  const isLoading = ref(false);
  const loadingProgress = ref(0);

  /**
   * Инициализирует компоненты для работы с моделями
   * Должен быть вызван после инициализации viewerCore
   */
  const init = async () => {
    if (!components.value || !workerUrl.value) {
      throw new Error(
        "Components и workerUrl должны быть инициализированы перед инициализацией ModelManager"
      );
    }

    // Инициализируем IfcLoader
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

    // Инициализируем FragmentsManager
    fragmentManager.value = components.value.get(OBC.FragmentsManager);
    fragmentManager.value.init(workerUrl.value);

    // Инициализируем Hider и Finder
    hider.value = components.value.get(OBC.Hider);
    finder.value = components.value.get(OBC.ItemsFinder);

    // Настраиваем обработчик для загружаемых моделей
    if (fragmentManager.value && currentWord.value) {
      fragmentManager.value.list.onItemSet.add(({ value: model }) => {
        if (!currentWord.value) {
          throw new Error("World is not exists");
        }

        model.useCamera(currentWord.value.camera.three);
        currentWord.value.scene.three.add(model.object);
        fragmentManager.value!.core.update(true);
      });
    }
  };

  /**
   * Загружает IFC модель из файла
   * @param path - путь к файлу (URL или blob URL)
   * @param name - имя модели
   * @returns Загруженная модель
   */
  const load = async (path: string, name: string): Promise<FragmentsModel> => {
    if (!ifcLoader.value) {
      throw new Error("IfcLoader не инициализирован. Вызовите init() сначала.");
    }

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

      await new Promise((resolve) => setTimeout(resolve, 500));

      return model;
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

  /**
   * Обрабатывает изменение файла и загружает модель
   * @param event - событие изменения файла
   */
  const handleFileChange = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const path = URL.createObjectURL(file);
      await load(path, file.name);

      if (!fragmentManager.value) {
        throw new Error("FragmentManager is null");
      }

      // Проверяем, что модель была добавлена в fragmentManager
      const modelName = file.name;
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
   * Выгружает текущую модель
   */
  const unload = () => {
    if (currentModel.value) {
      currentModel.value.dispose();
      currentModel.value = undefined;
    }
  };

  /**
   * Освобождает ресурсы менеджера моделей
   */
  const dispose = () => {
    try {
      // Выгружаем текущую модель
      unload();

      // Удаляем обработчики событий
      if (ifcLoader.value?.onIfcImporterInitialized) {
        ifcLoader.value.onIfcImporterInitialized.reset();
      }

      if (fragmentManager.value?.list?.onItemSet) {
        fragmentManager.value.list.onItemSet.reset();
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

      // Сбрасываем все значения
      ifcLoader.value = undefined;
      currentModel.value = undefined;
      fragmentManager.value = undefined;
      hider.value = undefined;
      finder.value = undefined;
      isLoading.value = false;
      loadingProgress.value = 0;
    } catch (error) {
      console.error("Ошибка при освобождении ресурсов model manager:", error);
    }
  };

  return {
    // Реактивные состояния
    ifcLoader,
    model: currentModel,
    fragmentManager,
    hider,
    finder,
    isLoading,
    loadingProgress,

    // Методы
    init,
    load,
    unload,
    handleFileChange,
    dispose,
  };
};
