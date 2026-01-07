import { computed, onUnmounted, type ComputedRef } from "vue";
import { FragmentsModel } from "@thatopen/fragments";
import { useIFCViewerStore } from "@/stores/useViewerCoreStore";
import { useViewerCore } from "./core/useViewerCore";
import { useModelManager } from "./core/useModelManager";
import { useModelData } from "./data/useModelData";
import { useSelection } from "./features/useSelection";
import * as OBC from "@thatopen/components";

export interface IFacadeCore {
  setupViewer: (containerElement: HTMLDivElement) => Promise<void>;
  disposeViewer: () => void;
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
  getEntityData: (modelId: string, localId: number) => Promise<any>;
}

export interface IFacadeSelection {
  clearHoverHighlight: () => void;
  clearSelectionHighlight: () => void;
  setSelectionHighlight: (modelIdMap: OBC.ModelIdMap) => void;
}

export interface IEmployeeViewerFacade {
  core: IFacadeCore;
  modelManager: IFacadeModelManager;
  modelDataAccess: IFacadeModelData;
  selection: IFacadeSelection;
}

export const useViewer = (): IEmployeeViewerFacade => {
  const store = useIFCViewerStore();

  const core = useViewerCore();
  const modelManager = useModelManager();
  const modelData = useModelData();
  const selection = useSelection();

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

  const disposeViewer = () => {
    modelData.clear();
    selection.highlight.clear();
    selection.hover.clear();
    modelManager.dispose();
    core.dispose();
  };

  const loadIfc = async (
    path: string,
    name: string
  ): Promise<FragmentsModel> => {
    if (store.modelManager.model) {
      modelData.clear();
      selection.highlight.clear();
      selection.hover.clear();
      modelManager.unload();
    }

    const model = await modelManager.loadModelByPath(path, name);
    await modelData.loadLevels(model.modelId);
    await modelData.loadEmployeeWorkplaces(model.modelId);
    return model;
  };

  const handleFileChange = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const path = URL.createObjectURL(file);
    await loadIfc(path, file.name);
  };

  onUnmounted(() => {
    disposeViewer();
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
      getElementInfo: modelData.getElementInfo,
      getEntityData: modelData.getEntityData,
    },
    selection: {
      clearHoverHighlight: () => selection.hover.clear(),
      clearSelectionHighlight: () => selection.highlight.clear(),
      setSelectionHighlight: (modelIdMap: OBC.ModelIdMap) =>
        selection.highlight.set(modelIdMap),
    },
  };
};
