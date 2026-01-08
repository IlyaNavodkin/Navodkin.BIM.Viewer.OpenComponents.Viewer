import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import { PostproductionAspect } from "@thatopen/components-front";
import { useIFCViewerStore } from "../../../../../stores/useViewerCoreStore";

export interface IEmployeeViewerCore {
  init: (containerElement: HTMLDivElement) => Promise<void>;
  dispose: () => void;
}

export const useViewerCore = (): IEmployeeViewerCore => {
  const store = useIFCViewerStore();

  const init = async (containerElement: HTMLDivElement) => {
    if (!containerElement) {
      throw new Error("Container element is required");
    }

    if (!store) {
      throw new Error("Store is not available");
    }

    const components = new OBC.Components();
    const worlds = components.get(OBC.Worlds);
    const world = worlds.create<
      OBC.SimpleScene,
      OBC.SimpleCamera,
      OBF.PostproductionRenderer
    >();

    world.scene = new OBC.SimpleScene(components);
    world.renderer = new OBF.PostproductionRenderer(
      components,
      containerElement
    );
    world.camera = new OBC.SimpleCamera(components);

    world.scene.setup();

    world.scene.three.background = null;
    world.renderer.postproduction.enabled = true;
    world.dynamicAnchor = false;

    components.init();

    const githubUrl =
      "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
    const fetchedUrl = await fetch(githubUrl);
    const workerBlob = await fetchedUrl.blob();
    const workerFile = new File([workerBlob], "worker.mjs", {
      type: "text/javascript",
    });

    const workerUrl = URL.createObjectURL(workerFile);
    store.initializeCore(containerElement, components, worlds, world, workerUrl);

    console.log(store.core.workerUrl);

    console.log("Auto selection configured");
  };

  const dispose = () => {
    try {
      if (store.core.workerUrl) {
        try {
          URL.revokeObjectURL(store.core.workerUrl);
        } catch (error) {
          console.warn("Error disposing worker URL:", error);
        }
      }

      if (store.core.currentWorld) {
        try {
          if (typeof store.core.currentWorld.dispose === "function") {
            store.core.currentWorld.dispose();
          }
        } catch (error) {
          console.warn("Error disposing world:", error);
        }
      }

      if (store.core.components) {
        try {
          store.core.components.dispose();
        } catch (error) {
          console.warn("Error disposing components:", error);
        }
      }

      store.clearCore();
    } catch (error) {
      console.error("Error disposing viewer core resources:", error);
    }
  };

  return {
    init,
    dispose,
  };
};
