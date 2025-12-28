import { ref, shallowRef, type Ref } from "vue";
import * as OBC from "@thatopen/components";
import { FragmentsModel, LodMode } from "@thatopen/fragments";
import { useViewerCoreStore } from "@/stores/useViewerCoreStore";

/**
 * Менеджер моделей для загрузки и выгрузки IFC моделей
 * Отвечает за управление текущей моделью и состоянием загрузки
 */
export const useModelManager = () => {
  const store = useViewerCoreStore();

  /**
   * Инициализирует компоненты для работы с моделями
   * Должен быть вызван после инициализации viewerCore
   */
  const init = async () => {
    if (!store.core.components.value || !store.core.workerUrl.value) {
      throw new Error(
        "Components и workerUrl должны быть инициализированы перед инициализацией ModelManager"
      );
    }

    // ВАЖНО: убеждаемся, что isLoading сброшен при инициализации
    console.log(
      `[useModelManager.init] Сбрасываем isLoading: ${store.modelManager.isLoading.value} -> false`
    );
    store.setIsLoading(false);
    store.setLoadingProgress(0);
    console.log(
      `[useModelManager.init] После сброса isLoading: ${store.modelManager.isLoading.value}`
    );

    // Инициализируем IfcLoader
    store.modelManager.ifcLoader.value = store.core.components.value.get(
      OBC.IfcLoader
    );

    store.modelManager.ifcLoader.value.onIfcImporterInitialized.add(
      (importer) => {
        console.log(importer.classes);
      }
    );

    await store.modelManager.ifcLoader.value.setup({
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
    store.modelManager.fragmentManager.value = store.core.components.value.get(
      OBC.FragmentsManager
    );
    store.modelManager.fragmentManager.value.init(store.core.workerUrl.value);

    // Инициализируем Hider и Finder
    store.modelManager.hider.value = store.core.components.value.get(OBC.Hider);
    store.modelManager.finder.value = store.core.components.value.get(
      OBC.ItemsFinder
    );

    // Настраиваем обработчик для загружаемых моделей
    if (
      store.modelManager.fragmentManager.value &&
      store.core.currentWord.value
    ) {
      store.modelManager.fragmentManager.value.list.onItemSet.add(
        ({ value: model }) => {
          if (!store.core.currentWord.value) {
            throw new Error("World is not exists");
          }

          model.useCamera(store.core.currentWord.value.camera.three);
          store.core.currentWord.value.scene.three.add(model.object);
          store.modelManager.fragmentManager.value!.core.update(true);
        }
      );
    }
  };

  /**
   * Загружает IFC модель из файла
   * @param path - путь к файлу (URL или blob URL)
   * @param name - имя модели
   * @returns Загруженная модель
   */
  const load = async (path: string, name: string): Promise<FragmentsModel> => {
    if (!store.modelManager.ifcLoader.value) {
      throw new Error("IfcLoader не инициализирован. Вызовите init() сначала.");
    }

    try {
      console.log(
        `[useModelManager.load] Устанавливаем isLoading: ${store.modelManager.isLoading.value} -> true`
      );
      store.setIsLoading(true);
      store.setLoadingProgress(0);

      const getFileResponse = await fetch(path);
      const data = await getFileResponse.arrayBuffer();
      const buffer = new Uint8Array(data);

      const model = await store.modelManager.ifcLoader.value.load(
        buffer,
        true,
        name,
        {
          processData: {
            progressCallback: (progress: any) => {
              if (typeof progress === "number") {
                store.setLoadingProgress(Math.min(100, Math.max(0, progress)));
              } else if (progress && typeof progress === "object") {
                const progressValue =
                  (progress as any).progress ??
                  (progress as any).percentage ??
                  (progress as any).value ??
                  0;
                store.setLoadingProgress(
                  Math.min(100, Math.max(0, progressValue))
                );
              }
              console.log(
                `[useModelManager.load] Progress callback вызван:`,
                store.modelManager.loadingProgress.value,
                `(тип progress: ${typeof progress})`
              );
            },
          },
        }
      );

      model.setLodMode(LodMode.ALL_VISIBLE);
      store.modelManager.model.value = model;
      store.setLoadingProgress(100);

      await new Promise((resolve) => setTimeout(resolve, 500));

      return model;
    } catch (error) {
      console.error("Ошибка при загрузке модели:", error);
      throw error;
    } finally {
      console.log(
        `[useModelManager.load] Сбрасываем isLoading в finally: ${store.modelManager.isLoading.value} -> false`
      );
      store.setIsLoading(false);
      setTimeout(() => {
        store.setLoadingProgress(0);
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

      if (!store.modelManager.fragmentManager.value) {
        throw new Error("FragmentManager is null");
      }

      // Проверяем, что модель была добавлена в fragmentManager
      const modelName = file.name;
      const modelExists =
        store.modelManager.fragmentManager.value.list.has(modelName);

      if (!modelExists) {
        console.warn(
          `Модель "${modelName}" не найдена в fragmentManager. Доступные модели:`,
          Array.from(store.modelManager.fragmentManager.value.list.keys())
        );
        return;
      }
    }
  };

  /**
   * Выгружает текущую модель
   */
  const unload = () => {
    if (store.modelManager.model.value) {
      store.modelManager.model.value.dispose();
      store.modelManager.model.value = undefined;
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
      if (store.modelManager.ifcLoader.value?.onIfcImporterInitialized) {
        store.modelManager.ifcLoader.value.onIfcImporterInitialized.reset();
      }

      if (store.modelManager.fragmentManager.value?.list?.onItemSet) {
        store.modelManager.fragmentManager.value.list.onItemSet.reset();
      }

      // Очищаем fragmentManager
      if (store.modelManager.fragmentManager.value) {
        try {
          if (
            typeof store.modelManager.fragmentManager.value.dispose ===
            "function"
          ) {
            store.modelManager.fragmentManager.value.dispose();
          }
        } catch (error) {
          console.warn("Ошибка при освобождении fragmentManager:", error);
        }
      }

      // Сбрасываем все значения
      store.modelManager.ifcLoader.value = undefined;
      store.modelManager.model.value = undefined;
      store.modelManager.fragmentManager.value = undefined;
      store.modelManager.hider.value = undefined;
      store.modelManager.finder.value = undefined;
      store.setIsLoading(false);
      store.setLoadingProgress(0);
    } catch (error) {
      console.error("Ошибка при освобождении ресурсов model manager:", error);
    }
  };

  return {
    init,
    load,
    unload,
    handleFileChange,
    dispose,
  };
};
