import { computed, onBeforeUnmount, onMounted, type ComputedRef } from "vue";
import { useIfcViewerEngine } from "./useIfcViewerEngine";
import {
  useIfcViewerStoreById,
  type IIfcViewerStoreByIdComposable,
} from "./useIfcViewerStoreById";
import type { IfcViewerStateSnapshot } from "../types/ifcViewer";

export interface IIfcViewerPageComposableParams {
  viewerId: string;
}

export interface IIfcViewerPageComposable {
  viewerStore: IIfcViewerStoreByIdComposable;
  state: ComputedRef<IfcViewerStateSnapshot>;
  canDownloadFrag: ComputedRef<boolean>;
  onViewportMounted(container: HTMLDivElement): Promise<void>;
  onViewportUnmounted(): void;
  onIfcFileSelected(file: File | null): Promise<void>;
  onFragFileSelected(file: File | null): Promise<void>;
  onFragDownload(): Promise<void>;
}

export function useIfcViewerPage(
  params: IIfcViewerPageComposableParams,
): IIfcViewerPageComposable {
  const viewerStore = useIfcViewerStoreById({
    viewerId: params.viewerId,
  });
  const engine = useIfcViewerEngine({
    viewerStore,
  });

  const state = computed(() => viewerStore.state.value);
  const canDownloadFrag = computed(
    () => viewerStore.state.value.currentModel?.canExportFrag ?? false,
  );

  onMounted(() => {
    viewerStore.initializeEmptyProject();
  });

  onBeforeUnmount(() => {
    engine.unmount();
    viewerStore.dispose();
  });

  return {
    viewerStore,
    state,
    canDownloadFrag,
    onViewportMounted: async (container) => {
      await engine.mount(container);
    },
    onViewportUnmounted: () => {
      engine.unmount();
    },
    onIfcFileSelected: async (file) => {
      if (!file) {
        return;
      }

      await engine.loadIfcFile(file);
    },
    onFragFileSelected: async (file) => {
      if (!file) {
        return;
      }

      await engine.loadFragFile(file);
    },
    onFragDownload: async () => {
      await engine.downloadCurrentFrag();
    },
  };
}
