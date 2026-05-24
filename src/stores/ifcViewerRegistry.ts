import { defineStore } from "pinia";
import type {
  IfcViewerContextMenuState,
  IfcViewerModelTreeNode,
  IfcViewerSelectionState,
  IfcViewerSelectedElement,
  IfcViewerStateSnapshot,
  IfcViewerTreeNode,
} from "../types/ifcViewer";

interface IfcViewerRegistryState {
  viewers: Record<string, IfcViewerStateSnapshot>;
}

function createContextMenuState(): IfcViewerContextMenuState {
  return {
    isVisible: false,
    x: 0,
    y: 0,
    modelId: null,
  };
}

function createSelectionState(): IfcViewerSelectionState {
  return {
    activeTreeNodeId: null,
    highlightedTreeNodeIds: [],
    selectionAnchorTreeNodeId: null,
    highlightedElementIds: [],
  };
}

function createViewerState(viewerId: string): IfcViewerStateSnapshot {
  return {
    viewerId,
    projectName: "Untitled IFC Project",
    isReady: false,
    isLoading: false,
    progress: null,
    statusText: "Empty project",
    errorMessage: null,
    models: [],
    selectedElement: null,
    selection: createSelectionState(),
    contextMenu: createContextMenuState(),
  };
}

function findTreeNodeById(
  nodes: IfcViewerTreeNode[],
  nodeId: string,
): IfcViewerTreeNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }

    const nestedNode = findTreeNodeById(node.children, nodeId);
    if (nestedNode) {
      return nestedNode;
    }
  }

  return null;
}

export const useIfcViewerRegistryStore = defineStore("ifc-viewer-registry", {
  state: (): IfcViewerRegistryState => ({
    viewers: {},
  }),
  actions: {
    ensureViewer(viewerId: string) {
      if (!this.viewers[viewerId]) {
        this.viewers[viewerId] = createViewerState(viewerId);
      }
    },
    resetViewer(viewerId: string) {
      this.viewers[viewerId] = createViewerState(viewerId);
    },
    disposeViewer(viewerId: string) {
      delete this.viewers[viewerId];
    },
    setViewerReady(viewerId: string, isReady: boolean) {
      this.ensureViewer(viewerId);
      this.viewers[viewerId].isReady = isReady;
    },
    setViewerLoading(
      viewerId: string,
      payload: {
        isLoading: boolean;
        statusText?: string;
        progress?: number | null;
      },
    ) {
      this.ensureViewer(viewerId);
      const viewer = this.viewers[viewerId];
      viewer.isLoading = payload.isLoading;
      viewer.statusText = payload.statusText ?? viewer.statusText;
      viewer.progress =
        payload.progress === undefined ? viewer.progress : payload.progress;
    },
    setViewerError(viewerId: string, errorMessage: string | null) {
      this.ensureViewer(viewerId);
      this.viewers[viewerId].errorMessage = errorMessage;
    },
    setProjectName(viewerId: string, projectName: string) {
      this.ensureViewer(viewerId);
      this.viewers[viewerId].projectName = projectName;
    },
    upsertModel(viewerId: string, model: IfcViewerModelTreeNode) {
      this.ensureViewer(viewerId);
      const viewer = this.viewers[viewerId];
      const index = viewer.models.findIndex((entry) => entry.id === model.id);

      if (index === -1) {
        viewer.models.push(model);
        return;
      }

      viewer.models[index] = model;
    },
    removeModel(viewerId: string, modelId: string) {
      this.ensureViewer(viewerId);
      const viewer = this.viewers[viewerId];
      viewer.models = viewer.models.filter((model) => model.id !== modelId);

      if (viewer.selectedElement?.modelId === modelId) {
        viewer.selectedElement = null;
      }

      if (viewer.contextMenu.modelId === modelId) {
        viewer.contextMenu = createContextMenuState();
      }

      viewer.selection.highlightedTreeNodeIds =
        viewer.selection.highlightedTreeNodeIds.filter(
          (nodeId) => !nodeId.startsWith(`${modelId}:`),
        );
      viewer.selection.highlightedElementIds =
        viewer.selection.highlightedElementIds.filter(
          (elementId) => !elementId.startsWith(`${modelId}:`),
        );

      if (
        viewer.selection.activeTreeNodeId?.startsWith(`${modelId}:`)
      ) {
        viewer.selection.activeTreeNodeId = null;
      }

      if (
        viewer.selection.selectionAnchorTreeNodeId?.startsWith(`${modelId}:`)
      ) {
        viewer.selection.selectionAnchorTreeNodeId = null;
      }
    },
    setModelExpanded(viewerId: string, modelId: string, isExpanded: boolean) {
      this.ensureViewer(viewerId);
      const model = this.viewers[viewerId].models.find(
        (entry) => entry.id === modelId,
      );

      if (!model) {
        return;
      }

      model.isExpanded = isExpanded;
    },
    setModelTree(viewerId: string, modelId: string, rootNodes: IfcViewerTreeNode[]) {
      this.ensureViewer(viewerId);
      const model = this.viewers[viewerId].models.find(
        (entry) => entry.id === modelId,
      );

      if (!model) {
        return;
      }

      model.rootNodes = rootNodes;
      model.categoryCount = rootNodes.length;
    },
    updateTreeNode(
      viewerId: string,
      modelId: string,
      nodeId: string,
      patch: Partial<IfcViewerTreeNode>,
    ) {
      this.ensureViewer(viewerId);
      const model = this.viewers[viewerId].models.find(
        (entry) => entry.id === modelId,
      );

      if (!model) {
        return;
      }

      const node = findTreeNodeById(model.rootNodes, nodeId);
      if (!node) {
        return;
      }

      Object.assign(node, patch);
    },
    setSelectedElement(
      viewerId: string,
      element: IfcViewerSelectedElement | null,
    ) {
      this.ensureViewer(viewerId);
      this.viewers[viewerId].selectedElement = element;
    },
    setSelectionState(
      viewerId: string,
      selection: IfcViewerSelectionState,
    ) {
      this.ensureViewer(viewerId);
      this.viewers[viewerId].selection = {
        activeTreeNodeId: selection.activeTreeNodeId,
        highlightedTreeNodeIds: [...selection.highlightedTreeNodeIds],
        selectionAnchorTreeNodeId: selection.selectionAnchorTreeNodeId,
        highlightedElementIds: [...selection.highlightedElementIds],
      };
    },
    showContextMenu(
      viewerId: string,
      payload: {
        x: number;
        y: number;
        modelId: string;
      },
    ) {
      this.ensureViewer(viewerId);
      this.viewers[viewerId].contextMenu = {
        isVisible: true,
        x: payload.x,
        y: payload.y,
        modelId: payload.modelId,
      };
    },
    hideContextMenu(viewerId: string) {
      this.ensureViewer(viewerId);
      this.viewers[viewerId].contextMenu = createContextMenuState();
    },
    setStatusText(viewerId: string, statusText: string) {
      this.ensureViewer(viewerId);
      this.viewers[viewerId].statusText = statusText;
    },
  },
});
