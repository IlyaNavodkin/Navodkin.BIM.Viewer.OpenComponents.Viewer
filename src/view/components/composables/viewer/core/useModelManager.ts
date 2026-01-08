import * as OBC from "@thatopen/components";
import { FragmentsModel, IfcImporter, LodMode } from "@thatopen/fragments";
import { useIFCViewerStore } from "@/stores/useViewerCoreStore";
import { PostproductionAspect } from "@thatopen/components-front";

export interface IEmployeeViewerModelManager {
  init: () => Promise<void>;
  loadModelByPath: (path: string, name: string) => Promise<FragmentsModel>;
  unload: () => void;
  handleFileChange: (event: Event) => Promise<void>;
  dispose: () => void;
}

export const useModelManager = (): IEmployeeViewerModelManager => {
  const store = useIFCViewerStore();

  const init = async () => {
    if (
      !store.core.components ||
      !store.core.workerUrl ||
      !store.core.currentWorld ||
      !store.core.currentWorld.renderer
    ) {
      throw new Error(
        "Components and workerUrl must be initialized before ModelManager initialization"
      );
    }

    const ifcLoader = store.core.components.get(OBC.IfcLoader);

    ifcLoader.onIfcImporterInitialized.add(handleIfcImporterInitialized);

    await ifcLoader.setup({
      autoSetWasm: false,
      wasm: {
        path: "https://unpkg.com/web-ifc@0.0.72/",
        absolute: true,
      },
      webIfc: {
        COORDINATE_TO_ORIGIN: false,
      },
    });

    const fragmentManager = store.core.components.get(OBC.FragmentsManager);
    fragmentManager.init(store.core.workerUrl);

    store.core.currentWorld.renderer.postproduction.style =
      PostproductionAspect.COLOR_PEN_SHADOWS;

    const hider = store.core.components.get(OBC.Hider);
    const finder = store.core.components.get(OBC.ItemsFinder);

    store.initializeModelManager(ifcLoader, fragmentManager, hider, finder);

    store.core.currentWorld!.camera.controls.addEventListener("rest", () => {
      const fragmentMgr = store.modelManager.fragmentManager;
      if (!fragmentMgr) {
        throw new Error("FragmentManager is not exists");
      }
      fragmentMgr.core.update(true);
    });

    fragmentManager.list.onItemSet.add(({ value: model }) => {
      if (!store.core.currentWorld) {
        throw new Error("World is not exists");
      }

      model.useCamera(store.core.currentWorld.camera.three);
      store.core.currentWorld.scene.three.add(model.object);
      fragmentManager.core.update(true);
    });
  };

  const handleIfcImporterInitialized = (importer: IfcImporter) => {
    console.log(importer.classes);
  };

  const handleProgress = (progress: any) => {
    store.setLoadingProgress(Math.min(100, Math.max(0, progress)));
  };

  const loadModelByPath = async (
    path: string,
    name: string
  ): Promise<FragmentsModel> => {
    if (!store.modelManager.ifcLoader) {
      throw new Error("IfcLoader is not initialized. Call init() first.");
    }

    try {
      store.setIsLoading(true);
      store.setLoadingProgress(0);

      const getFileResponse = await fetch(path);
      const data = await getFileResponse.arrayBuffer();
      const buffer = new Uint8Array(data);

      store.modelManager.fragmentManager?.list.clear();

      const model = await store.modelManager.ifcLoader!.load(
        buffer,
        true,
        name,
        {
          processData: {
            progressCallback: handleProgress,
          },
        }
      );

      model.setLodMode(LodMode.ALL_VISIBLE);
      store.setModel(model);
      store.setLoadingProgress(100);

      await new Promise((resolve) => setTimeout(resolve, 500));

      return model;
    } catch (error) {
      console.error("Error loading model:", error);
      throw error;
    } finally {
      store.setIsLoading(false);
      setTimeout(() => {
        store.setLoadingProgress(0);
      }, 300);
    }
  };

  const handleFileChange = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const path = URL.createObjectURL(file);
      await loadModelByPath(path, file.name);
    }
  };

  const unload = () => {
    if (store.modelManager.model) {
      store.modelManager.model.dispose();
      store.setModel(undefined);
    }
  };

  const dispose = () => {
    try {
      unload();

      if (store.modelManager.ifcLoader?.onIfcImporterInitialized) {
        store.modelManager.ifcLoader.onIfcImporterInitialized.reset();
      }

      if (store.modelManager.fragmentManager?.list?.onItemSet) {
        store.modelManager.fragmentManager.list.onItemSet.reset();
      }

      if (store.modelManager.fragmentManager) {
        try {
          store.modelManager.fragmentManager.dispose();
        } catch (error) {
          console.warn("Error disposing fragmentManager:", error);
        }
      }

      store.clearModelManager();
    } catch (error) {
      console.error("Error disposing model manager resources:", error);
    }
  };

  return {
    init,
    loadModelByPath,
    unload,
    handleFileChange,
    dispose,
  };
};
