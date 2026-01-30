import * as OBC from "@thatopen/components";
import { FragmentsModel, LodMode } from "@thatopen/fragments";

type ModelLoadProgressCallback = (progress: number) => void;
type ModelLoadProgressDoneCallback = (modelId: string) => void;

type ModelLoadedCallback = (model: FragmentsModel) => void;

// Singleton для управления components
class ViewerService {
  private static instance: ViewerService;
  private components: OBC.Components | null = null;
  private modelLoadedCallbacks: ModelLoadedCallback[] = [];
  private progressCallbacks: ModelLoadProgressCallback[] = [];
  private modelLoadProgressDoneCallbacks: ModelLoadProgressDoneCallback[] = [];
  private constructor() { }

  static getInstance(): ViewerService {
    if (!ViewerService.instance) {
      ViewerService.instance = new ViewerService();
    }
    return ViewerService.instance;
  }

  private checkComponentsInitialized(): void {
    if (!this.components)
      throw new Error("Components not initialized - use initViewer() first");
  }

  getComponents(): OBC.Components {
    this.checkComponentsInitialized();
    return this.components!;
  }

  getFragmentManager(): OBC.FragmentsManager {
    this.checkComponentsInitialized();
    return this.components!.get(OBC.FragmentsManager)!;
  }

  initViewer(): void {
    this.initComponents();
    if (!this.components) return;
    this.initFragmentManager(this.components);
    this.initIfcLoader(this.components);
  }

  async initIfcLoader(components: OBC.Components): Promise<void> {
    const ifcLoader = components.get(OBC.IfcLoader);

    ifcLoader.onIfcImporterInitialized.add(async () => {
      console.log("IfcImporter initialized");
    });

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
  }

  async loadModelByPath(path: string, name: string): Promise<FragmentsModel> {
    const ifcLoader = this.components!.get(OBC.IfcLoader)!;

    try {
      const getFileResponse = await fetch(path);
      const data = await getFileResponse.arrayBuffer();
      const buffer = new Uint8Array(data);

      const model = await ifcLoader.load(buffer, true, name, {
        processData: {
          progressCallback: (progress: number) => {
            this.progressCallbacks.forEach((callback) => {
              callback(progress);
            });
          },
        },
      });

      model.setLodMode(LodMode.ALL_VISIBLE);

      this.modelLoadProgressDoneCallbacks.forEach((callback) => {
        callback(name);
      });

      return model;
    } catch (error) {
      console.error("Error loading model:", error);
      throw error;
    }
  }

  onProgress(callback: ModelLoadProgressCallback): void {
    this.progressCallbacks.push(callback);
  }

  offProgress(callback: ModelLoadProgressCallback): void {
    const index = this.progressCallbacks.indexOf(callback);
    if (index > -1) {
      this.progressCallbacks.splice(index, 1);
    }
  }

  onModelLoadProgressDone(callback: ModelLoadProgressDoneCallback): void {
    this.modelLoadProgressDoneCallbacks.push(callback);
  }

  offModelLoadProgressDone(callback: ModelLoadProgressDoneCallback): void {
    const index = this.modelLoadProgressDoneCallbacks.indexOf(callback);
    if (index > -1) {
      this.modelLoadProgressDoneCallbacks.splice(index, 1);
    }
  }

  initComponents(): void {
    if (!this.components) {
      this.components = new OBC.Components();

      console.log("Initializing components");
      this.components.init();
    }
  }

  initFragmentManager(components: OBC.Components): OBC.FragmentsManager {
    const workerUrl = "/worker.mjs";

    const fragments = components.get(OBC.FragmentsManager);

    if (!fragments.initialized) {
      console.log("Initializing fragments");
      fragments.init(workerUrl);

      fragments.list.onItemSet.add(({ value: model }) => {
        console.log("Item set EVENT", model);
        this.modelLoadedCallbacks.forEach((callback) => {
          try {
            callback(model);
          } catch (error) {
            console.error("Ошибка в коллбеке загрузки модели:", error);
          }
        });
        fragments!.core.update(true);
      });
    }

    return fragments;
  }

  onModelLoaded(callback: ModelLoadedCallback): () => void {
    this.modelLoadedCallbacks.push(callback);
    // Возвращаем функцию для отписки
    return () => {
      const index = this.modelLoadedCallbacks.indexOf(callback);
      if (index > -1) {
        this.modelLoadedCallbacks.splice(index, 1);
      }
    };
  }

  // Метод для отписки от события загрузки модели
  offModelLoaded(callback: ModelLoadedCallback): void {
    const index = this.modelLoadedCallbacks.indexOf(callback);
    if (index > -1) {
      this.modelLoadedCallbacks.splice(index, 1);
    }
  }

  dispose(): void {
    if (this.components) {
      // Очищаем все компоненты
      const worlds = this.components.get(OBC.Worlds);
      if (worlds) {
        for (const [, world] of worlds.list) {
          world.dispose();
        }
        worlds.list.clear();
      }

      const fragments = this.components.get(OBC.FragmentsManager);
      if (fragments) {
        fragments.dispose();
      }

      this.components.dispose();
      this.components = null;
    }
  }

  private disposeWorlds(components: OBC.Components): void {
    const worlds = components.get(OBC.Worlds);
    if (!worlds) return;
    if (worlds) {
      for (const [, world] of worlds.list) {
        world.dispose();
      }
      worlds.list.clear();
    }
  }

  private disposeModels(components: OBC.Components): void {
    const fragments = components.get(OBC.FragmentsManager);
    if (fragments) {
      fragments.list.clear();
    }
  }

  private releaseEvents(): void {
    this.modelLoadedCallbacks = [];
    this.progressCallbacks = [];
    this.modelLoadProgressDoneCallbacks = [];
  }
  reset(): void {
    if (!this.components) return;

    this.disposeWorlds(this.components);
    this.disposeModels(this.components);
    this.releaseEvents();
  }
}

export const viewerService = ViewerService.getInstance();
