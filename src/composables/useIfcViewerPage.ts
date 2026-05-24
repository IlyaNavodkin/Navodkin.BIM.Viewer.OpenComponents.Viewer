import { computed, onBeforeUnmount, onMounted, type ComputedRef } from "vue";
import { useIfcViewerEngine } from "./useIfcViewerEngine";
import { useIfcViewerProject } from "./useIfcViewerProject";
import { useIfcViewerSelection } from "./useIfcViewerSelection";
import {
  useIfcViewerStoreById,
  type IIfcViewerStoreByIdComposable,
} from "./useIfcViewerStoreById";
import type {
  IfcViewerSelectionState,
  IfcViewerTreeNode,
} from "../types/ifcViewer";

export interface IIfcViewerPageComposableParams {
  viewerId: string;
}

export interface IIfcViewerPageComposable {
  viewerStore: IIfcViewerStoreByIdComposable;
  state: ComputedRef<IIfcViewerStoreByIdComposable["state"]["value"]>;
  onViewportMounted(container: HTMLDivElement): Promise<void>;
  onViewportUnmounted(): void;
  onFilesSelected(files: File[]): Promise<void>;
  onModelToggle(modelId: string): void;
  onTreeNodeToggle(modelId: string, nodeId: string): void;
  onTreeSelectionChange(payload: {
    activeNodeId: string | null;
    highlightedNodeIds: string[];
    selectionAnchorNodeId: string | null;
  }): Promise<void>;
  onTreeNodeFocus(nodeId: string): Promise<void>;
  onElementSelect(modelId: string, localId: number): Promise<void>;
  onModelContextMenu(payload: { x: number; y: number; modelId: string }): void;
  onContextMenuDismiss(): void;
  onContextMenuDelete(modelId: string): Promise<void>;
}

function createElementId(modelId: string, localId: number) {
  return `${modelId}:${localId}`;
}

function findTreeNodeById(
  nodes: IfcViewerTreeNode[],
  nodeId: string,
): IfcViewerTreeNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }

    const nestedMatch = findTreeNodeById(node.children, nodeId);
    if (nestedMatch) {
      return nestedMatch;
    }
  }

  return null;
}

function findNodeInModels(
  models: IIfcViewerStoreByIdComposable["state"]["value"]["models"],
  nodeId: string | null,
) {
  if (!nodeId) {
    return null;
  }

  for (const model of models) {
    const match = findTreeNodeById(model.rootNodes, nodeId);
    if (match) {
      return match;
    }
  }

  return null;
}

function collectLeafElementIds(node: IfcViewerTreeNode): string[] {
  if (node.localId !== null) {
    return [createElementId(node.modelId, node.localId)];
  }

  return node.children.flatMap(collectLeafElementIds);
}

function buildSelectionState(
  models: IIfcViewerStoreByIdComposable["state"]["value"]["models"],
  payload: {
    activeNodeId: string | null;
    highlightedNodeIds: string[];
    selectionAnchorNodeId: string | null;
  },
): IfcViewerSelectionState {
  const highlightedTreeNodeIds = payload.highlightedNodeIds.filter((nodeId) =>
    Boolean(findNodeInModels(models, nodeId)),
  );

  const highlightedElementIds = highlightedTreeNodeIds.flatMap((nodeId) => {
    const node = findNodeInModels(models, nodeId);
    if (!node || node.localId === null) {
      return [];
    }

    return [createElementId(node.modelId, node.localId)];
  });

  return {
    activeTreeNodeId: findNodeInModels(models, payload.activeNodeId)?.id ?? null,
    highlightedTreeNodeIds: [...new Set(highlightedTreeNodeIds)],
    selectionAnchorTreeNodeId:
      findNodeInModels(models, payload.selectionAnchorNodeId)?.id ?? null,
    highlightedElementIds: [...new Set(highlightedElementIds)],
  };
}

export function useIfcViewerPage(
  params: IIfcViewerPageComposableParams,
): IIfcViewerPageComposable {
  const viewerStore = useIfcViewerStoreById({
    viewerId: params.viewerId,
  });
  const project = useIfcViewerProject({ viewerStore });
  const selection = useIfcViewerSelection({ viewerStore });
  const engine = useIfcViewerEngine({
    viewerStore,
    project,
    selection,
  });

  const state = computed(() => viewerStore.state.value);

  const closeContextMenu = () => {
    project.hideModelContextMenu();
  };

  onMounted(() => {
    viewerStore.initializeEmptyProject();
    window.addEventListener("click", closeContextMenu);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("click", closeContextMenu);
    engine.unmount();
    viewerStore.dispose();
  });

  return {
    viewerStore,
    state,
    onViewportMounted: async (container) => {
      await engine.mount(container);
    },
    onViewportUnmounted: () => {
      engine.unmount();
    },
    onFilesSelected: async (files) => {
      await engine.loadFiles(files);
    },
    onModelToggle: (modelId) => {
      const model = project.models.value.find((entry) => entry.id === modelId);
      project.setModelExpanded(modelId, !(model?.isExpanded ?? false));
    },
    onTreeNodeToggle: (modelId, nodeId) => {
      const model = project.models.value.find((entry) => entry.id === modelId);
      if (!model) {
        return;
      }

      const queue = [...model.rootNodes];
      while (queue.length > 0) {
        const node = queue.shift();
        if (!node) {
          continue;
        }
        if (node.id === nodeId) {
          project.updateTreeNode(modelId, nodeId, {
            isExpanded: !node.isExpanded,
          });
          return;
        }
        queue.push(...node.children);
      }
    },
    onTreeSelectionChange: async (payload) => {
      const nextSelectionState = buildSelectionState(
        project.models.value,
        payload,
      );
      const activeNode = findNodeInModels(
        project.models.value,
        nextSelectionState.activeTreeNodeId,
      );
      const activeElementId =
        activeNode && activeNode.localId !== null
          ? createElementId(activeNode.modelId, activeNode.localId)
          : null;

      selection.setSelectionState(nextSelectionState);
      await engine.applySelection(
        activeElementId,
        nextSelectionState.highlightedElementIds,
      );
    },
    onTreeNodeFocus: async (nodeId) => {
      const node = findNodeInModels(project.models.value, nodeId);
      if (!node) {
        return;
      }

      const focusElementIds = collectLeafElementIds(node);
      await engine.focusElements(focusElementIds);
    },
    onElementSelect: async (modelId, localId) => {
      await engine.selectElement(modelId, localId);
    },
    onModelContextMenu: (payload) => {
      project.showModelContextMenu(payload);
    },
    onContextMenuDismiss: () => {
      project.hideModelContextMenu();
    },
    onContextMenuDelete: async (modelId) => {
      await engine.removeModel(modelId);
      project.hideModelContextMenu();
    },
  };
}
