import { computed, onUnmounted, type ComputedRef } from "vue";
import { FragmentsModel } from "@thatopen/fragments";
import { useViewerManagerStore } from "@/stores/useViewerManagerStore";
import { useViewerCore } from "./core/useViewerCore";
import { useModelManager } from "./core/useModelManager";
import { useLevels } from "./data/useLevels";
import { useDataAccess } from "./data/useDataAccess";
import { useSelection } from "./features/useSelection";
import * as OBC from "@thatopen/components";
import { useEmployeeWorkplace } from "./features/useEmployeeWorkplace";

export interface IFacadeCore {
  setupViewer: (containerElement: HTMLDivElement) => Promise<void>;
  disposeViewer: () => Promise<void>;
}

export interface IFacadeModelManager {
  loadedModel: ComputedRef<FragmentsModel | undefined>;
  isLoading: ComputedRef<boolean>;
  loadingProgress: ComputedRef<number>;
  isModelLoaded: ComputedRef<boolean>;
  isLoadingElements: ComputedRef<boolean>;

  loadIfc: (path: string, name: string) => Promise<FragmentsModel>;
  handleFileChange: (event: Event) => Promise<void>;
}

export interface IFacadeModelData {
  getElementInfo: (modelId: string, localId: number) => Promise<any>;
}

export interface IFacadeSelection {
  clearSelectionHighlight: () => Promise<void>;
  setSelectionHighlight: (modelIdMap: OBC.ModelIdMap) => Promise<void>;
}

export interface IEmployeeViewerFacade {
  core: IFacadeCore;
  modelManager: IFacadeModelManager;
  modelDataAccess: IFacadeModelData;
  selection: IFacadeSelection;
}

export const useViewer = (viewerId: string): IEmployeeViewerFacade => {
  const viewerManager = useViewerManagerStore();
  const store = viewerManager.getViewer(viewerId);

  const core = useViewerCore(viewerId);
  const modelManager = useModelManager(viewerId);
  const levels = useLevels(viewerId);
  const dataAccess = useDataAccess(viewerId);
  const selection = useSelection(viewerId);
  const employeeWorkplace = useEmployeeWorkplace(viewerId);

  const loadedModel = computed(() => {
    return store.modelManager.model;
  });

  const isLoading = computed(() => {
    return store.modelManager.isLoading ?? false;
  });

  const loadingProgress = computed(() => {
    return store.modelManager.loadingProgress ?? 0;
  });

  const isModelLoaded = computed(() => {
    console.log("isModelLoaded", store.modelManager?.model);
    return store.modelManager?.model !== undefined;
  });

  const isLoadingElements = computed(() => {
    return store.modelManager?.isLoading ?? false;
  });

  const setupViewer = async (containerElement: HTMLDivElement) => {
    await core.init(containerElement);
    await modelManager.init();
    selection.init();
  };

  const disposeViewer = async () => {
    levels.clear();
    employeeWorkplace.clearWorkplaces();
    await selection.highlight.clear();
    modelManager.dispose();
    core.dispose();
  };

  const loadIfc = async (
    path: string,
    name: string
  ): Promise<FragmentsModel> => {
    if (store.modelManager.model) {
      levels.clear();
      employeeWorkplace.clearWorkplaces();
      await selection.highlight.clear();
      modelManager.unload();
    }

    const model = await modelManager.loadModelByPath(path, name);
    await levels.loadLevels(model.modelId);
    await employeeWorkplace.loadEmployeeWorkplaces(model.modelId);
    await employeeWorkplace.selectWorkplaceFromRoute();

    return model;
  };

  const handleFileChange = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const path = URL.createObjectURL(file);
    await loadIfc(path, file.name);
  };

  onUnmounted(async () => {
    await disposeViewer();
  });

  return {
    core: {
      setupViewer,
      disposeViewer,
    },
    modelManager: {
      loadedModel,
      isLoading,
      loadingProgress,
      isModelLoaded,
      isLoadingElements,

      loadIfc,
      handleFileChange,
    },
    modelDataAccess: {
      getElementInfo: dataAccess.getElementInfo,
    },
    selection: {
      clearSelectionHighlight: () => selection.highlight.clear(),
      setSelectionHighlight: (modelIdMap: OBC.ModelIdMap) =>
        selection.highlight.set(modelIdMap),
    },
  };
};
