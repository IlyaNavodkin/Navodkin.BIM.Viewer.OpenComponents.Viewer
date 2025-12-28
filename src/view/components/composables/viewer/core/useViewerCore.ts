import { ref, shallowRef, type ShallowRef } from "vue";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import { PostproductionAspect } from "@thatopen/components-front";

/**
 * Базовый слой для инициализации и управления жизненным циклом viewer
 * Отвечает за создание и настройку базовых компонентов (Components, Worlds, Renderer, Camera, Scene)
 */
export const useViewerCore = () => {
  const container = shallowRef<HTMLDivElement | undefined>(undefined);
  const components = shallowRef<OBC.Components | undefined>(undefined);
  const words = shallowRef<OBC.Worlds | undefined>(undefined);
  const currentWord = shallowRef<
    | OBC.SimpleWorld<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>
    | undefined
  >(undefined);
  const workerUrl = shallowRef<string | undefined>(undefined);
  const isInitialized = ref(false);

  /**
   * Инициализирует базовые компоненты viewer
   * @param containerElement - HTML элемент контейнера для viewer
   * @param options - опциональные параметры инициализации
   */
  const init = async (containerElement: HTMLDivElement) => {
    if (isInitialized.value) {
      console.warn("Viewer уже инициализирован");
      return;
    }

    if (!containerElement) {
      throw new Error("Container element is required");
    }

    container.value = containerElement;
    components.value = new OBC.Components();

    if (!components.value) {
      throw new Error("Failed to create Components");
    }

    // Создаем Worlds и World
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

    // Создаем Scene, Renderer и Camera
    const scene = new OBC.SimpleScene(componentsInstance);
    const render = new OBF.PostproductionRenderer(
      componentsInstance,
      containerInstance
    );
    const camera = new OBC.SimpleCamera(componentsInstance);

    if (!render || !camera) {
      throw new Error("Failed to create renderer or camera");
    }

    // Настраиваем World
    world.scene = scene;
    world.renderer = render;
    world.camera = camera;

    scene.setup();

    // Инициализируем компоненты
    components.value.init();

    // Включаем postproduction перед установкой стиля
    render.postproduction.enabled = true;

    // Создаем worker URL для FragmentsManager
    const githubUrl =
      "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
    const fetchedUrl = await fetch(githubUrl);
    const workerBlob = await fetchedUrl.blob();
    const workerFile = new File([workerBlob], "worker.mjs", {
      type: "text/javascript",
    });
    const createdWorkerUrl = URL.createObjectURL(workerFile);
    workerUrl.value = createdWorkerUrl;

    // Настраиваем postproduction стиль
    // Согласно документации, dynamicAnchor должен быть false для корректной работы postproduction
    world.dynamicAnchor = false;
    render.postproduction.style = PostproductionAspect.COLOR;

    // Получаем Raycasters для автоматического выделения при клике
    components.value.get(OBC.Raycasters).get(world);
    console.log("Автоматическое выделение настроено");

    isInitialized.value = true;
  };

  /**
   * Освобождает ресурсы базовых компонентов
   */
  const dispose = () => {
    try {
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

      // Очищаем components (это должно освободить все остальные ресурсы)
      if (components.value) {
        try {
          components.value.dispose();
        } catch (error) {
          console.warn("Ошибка при освобождении components:", error);
        }
      }

      // Сбрасываем все значения
      container.value = undefined;
      components.value = undefined;
      words.value = undefined;
      currentWord.value = undefined;
      isInitialized.value = false;
    } catch (error) {
      console.error("Ошибка при освобождении ресурсов viewer core:", error);
    }
  };

  return {
    // Реактивные состояния
    container,
    components,
    words,
    currentWord,
    workerUrl,
    isInitialized,

    // Методы
    init,
    dispose,
  };
};
