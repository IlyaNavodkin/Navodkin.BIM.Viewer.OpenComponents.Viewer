import { computed, type ComputedRef } from "vue";
import type {
  IfcViewerModelTreeNode,
  IfcViewerTreeNode,
} from "../types/ifcViewer";
import type { IIfcViewerStoreByIdComposable } from "./useIfcViewerStoreById";

export interface IIfcViewerProjectComposableParams {
  viewerStore: IIfcViewerStoreByIdComposable;
}

export interface IIfcViewerProjectComposable {
  projectName: ComputedRef<string>;
  models: ComputedRef<IfcViewerModelTreeNode[]>;
  contextMenu: ComputedRef<
    IIfcViewerStoreByIdComposable["state"]["value"]["contextMenu"]
  >;
  registerModel(model: IfcViewerModelTreeNode): void;
  removeModelState(modelId: string): void;
  setModelExpanded(modelId: string, isExpanded: boolean): void;
  setModelTree(modelId: string, rootNodes: IfcViewerTreeNode[]): void;
  updateTreeNode(
    modelId: string,
    nodeId: string,
    patch: Partial<IfcViewerTreeNode>,
  ): void;
  showModelContextMenu(payload: { x: number; y: number; modelId: string }): void;
  hideModelContextMenu(): void;
}

export function useIfcViewerProject(
  params: IIfcViewerProjectComposableParams,
): IIfcViewerProjectComposable {
  const projectName = computed(() => params.viewerStore.state.value.projectName);
  const models = computed(() => params.viewerStore.state.value.models);
  const contextMenu = computed(() => params.viewerStore.state.value.contextMenu);

  return {
    projectName,
    models,
    contextMenu,
    registerModel: (model) => params.viewerStore.upsertModel(model),
    removeModelState: (modelId) => params.viewerStore.removeModel(modelId),
    setModelExpanded: (modelId, isExpanded) =>
      params.viewerStore.setModelExpanded(modelId, isExpanded),
    setModelTree: (modelId, rootNodes) =>
      params.viewerStore.setModelTree(modelId, rootNodes),
    updateTreeNode: (modelId, nodeId, patch) =>
      params.viewerStore.updateTreeNode(modelId, nodeId, patch),
    showModelContextMenu: (payload) => params.viewerStore.showContextMenu(payload),
    hideModelContextMenu: () => params.viewerStore.hideContextMenu(),
  };
}
