import { computed, type ComputedRef } from "vue";
import { storeToRefs } from "pinia";
import { useIfcViewerRegistryStore } from "../stores/ifcViewerRegistry";
import type {
  IfcViewerModelTreeNode,
  IfcViewerSelectionState,
  IfcViewerSelectedElement,
  IfcViewerStateSnapshot,
  IfcViewerTreeNode,
} from "../types/ifcViewer";

export interface IIfcViewerStoreByIdParams {
  viewerId: string;
}

export interface IIfcViewerStoreByIdComposable {
  viewerId: string;
  state: ComputedRef<IfcViewerStateSnapshot>;
  initializeEmptyProject(): void;
  dispose(): void;
  setReady(isReady: boolean): void;
  setLoading(payload: {
    isLoading: boolean;
    statusText?: string;
    progress?: number | null;
  }): void;
  setError(errorMessage: string | null): void;
  setStatusText(statusText: string): void;
  upsertModel(model: IfcViewerModelTreeNode): void;
  removeModel(modelId: string): void;
  setModelExpanded(modelId: string, isExpanded: boolean): void;
  setModelTree(modelId: string, rootNodes: IfcViewerTreeNode[]): void;
  updateTreeNode(
    modelId: string,
    nodeId: string,
    patch: Partial<IfcViewerTreeNode>,
  ): void;
  setSelectionState(selection: IfcViewerSelectionState): void;
  setSelectedElement(element: IfcViewerSelectedElement | null): void;
  showContextMenu(payload: { x: number; y: number; modelId: string }): void;
  hideContextMenu(): void;
}

export function useIfcViewerStoreById(
  params: IIfcViewerStoreByIdParams,
): IIfcViewerStoreByIdComposable {
  const registryStore = useIfcViewerRegistryStore();
  const { viewers } = storeToRefs(registryStore);

  registryStore.ensureViewer(params.viewerId);

  const state = computed<IfcViewerStateSnapshot>(() => {
    registryStore.ensureViewer(params.viewerId);
    return viewers.value[params.viewerId];
  });

  const initializeEmptyProject = () => {
    registryStore.resetViewer(params.viewerId);
  };

  return {
    viewerId: params.viewerId,
    state,
    initializeEmptyProject,
    dispose: () => registryStore.disposeViewer(params.viewerId),
    setReady: (isReady) => registryStore.setViewerReady(params.viewerId, isReady),
    setLoading: (payload) =>
      registryStore.setViewerLoading(params.viewerId, payload),
    setError: (errorMessage) =>
      registryStore.setViewerError(params.viewerId, errorMessage),
    setStatusText: (statusText) =>
      registryStore.setStatusText(params.viewerId, statusText),
    upsertModel: (model) => registryStore.upsertModel(params.viewerId, model),
    removeModel: (modelId) => registryStore.removeModel(params.viewerId, modelId),
    setModelExpanded: (modelId, isExpanded) =>
      registryStore.setModelExpanded(params.viewerId, modelId, isExpanded),
    setModelTree: (modelId, rootNodes) =>
      registryStore.setModelTree(params.viewerId, modelId, rootNodes),
    updateTreeNode: (modelId, nodeId, patch) =>
      registryStore.updateTreeNode(params.viewerId, modelId, nodeId, patch),
    setSelectionState: (selection) =>
      registryStore.setSelectionState(params.viewerId, selection),
    setSelectedElement: (element) =>
      registryStore.setSelectedElement(params.viewerId, element),
    showContextMenu: (payload) =>
      registryStore.showContextMenu(params.viewerId, payload),
    hideContextMenu: () => registryStore.hideContextMenu(params.viewerId),
  };
}
