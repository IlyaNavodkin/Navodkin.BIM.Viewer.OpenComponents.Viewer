import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import { PostproductionAspect } from "@thatopen/components-front";
import { useViewerCoreStore } from "../../../../../stores/useViewerCoreStore";

export const useViewerCore = () => {
  const store = useViewerCoreStore();

  const init = async (containerElement: HTMLDivElement) => {
    if (!containerElement) {
      throw new Error("Container element is required");
    }

    // ВАЖНО: убеждаемся, что isLoading сброшен при инициализации
    console.log(
      `[useViewerCore.init] Сбрасываем isLoading: ${store.modelManager.isLoading.value} -> false`
    );
    store.setIsLoading(false);
    store.setLoadingProgress(0);
    console.log(
      `[useViewerCore.init] После сброса isLoading: ${store.modelManager.isLoading.value}`
    );

    store.core.container.value = containerElement;

    const componentsInstance = new OBC.Components();
    store.core.components.value = componentsInstance;

    if (!componentsInstance) {
      throw new Error("Failed to create Components");
    }

    store.core.words.value = componentsInstance.get(OBC.Worlds);
    const world = store.core.words.value.create<
      OBC.SimpleScene,
      OBC.SimpleCamera,
      OBF.PostproductionRenderer
    >();
    store.core.currentWord.value = world;

    const containerInstance = store.core.container.value;

    if (!containerInstance) {
      throw new Error("Container is null");
    }

    const scene = new OBC.SimpleScene(componentsInstance);
    const render = new OBF.PostproductionRenderer(
      componentsInstance,
      containerInstance
    );
    const camera = new OBC.SimpleCamera(componentsInstance);

    if (!render || !camera) {
      throw new Error("Failed to create renderer or camera");
    }

    world.scene = scene;
    world.renderer = render;
    world.camera = camera;

    scene.setup();

    componentsInstance.init();

    render.postproduction.enabled = true;

    const githubUrl =
      "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
    const fetchedUrl = await fetch(githubUrl);
    const workerBlob = await fetchedUrl.blob();
    const workerFile = new File([workerBlob], "worker.mjs", {
      type: "text/javascript",
    });
    const createdWorkerUrl = URL.createObjectURL(workerFile);
    store.core.workerUrl.value = createdWorkerUrl;

    world.dynamicAnchor = false;
    render.postproduction.style = PostproductionAspect.COLOR;

    componentsInstance.get(OBC.Raycasters).get(world);

    console.log("Автоматическое выделение настроено");
  };

  const dispose = () => {
    try {
      if (store.core.workerUrl.value) {
        try {
          URL.revokeObjectURL(store.core.workerUrl.value);
        } catch (error) {
          console.warn("Ошибка при освобождении worker URL:", error);
        }
        store.core.workerUrl.value = undefined;
      }

      if (store.core.currentWord.value) {
        try {
          if (typeof store.core.currentWord.value.dispose === "function") {
            store.core.currentWord.value.dispose();
          }
        } catch (error) {
          console.warn("Ошибка при освобождении world:", error);
        }
      }

      if (store.core.components.value) {
        try {
          store.core.components.value.dispose();
        } catch (error) {
          console.warn("Ошибка при освобождении components:", error);
        }
      }

      store.core.container.value = undefined;
      store.core.components.value = undefined;
      store.core.words.value = undefined;
      store.core.currentWord.value = undefined;
    } catch (error) {
      console.error("Ошибка при освобождении ресурсов viewer core:", error);
    }
  };

  return {
    init,
    dispose,
  };
};
