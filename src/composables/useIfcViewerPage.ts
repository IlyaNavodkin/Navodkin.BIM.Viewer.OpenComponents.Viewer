import { computed, onBeforeUnmount, onMounted, type ComputedRef } from "vue";
import { useIfcViewerEngine } from "./useIfcViewerEngine";
import { useIfcViewerProject } from "./useIfcViewerProject";
import { useIfcViewerSelection } from "./useIfcViewerSelection";
import {
  useIfcViewerStoreById,
  type IIfcViewerStoreByIdComposable,
} from "./useIfcViewerStoreById";

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
  onElementSelect(modelId: string, localId: number): Promise<void>;
  onModelContextMenu(payload: { x: number; y: number; modelId: string }): void;
  onContextMenuDismiss(): void;
  onContextMenuDelete(modelId: string): Promise<void>;
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
