import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { createViewerStore, type ViewerStore } from "./useViewerCoreStore";

export const useViewerManagerStore = defineStore("viewerManager", () => {
  const _viewerStores = ref(new Map<string, any>());

  const activeViewersCount = computed(() => _viewerStores.value.size);

  const activeViewerIds = computed(() =>
    Array.from(_viewerStores.value.keys())
  );

  const hasViewer = computed(() => {
    return (viewerId: string) => _viewerStores.value.has(viewerId);
  });

  function createViewer(viewerId: string): ViewerStore {
    let store = _viewerStores.value.get(viewerId);

    if (!store) {
      console.log(`[ViewerManager] Creating new viewer: ${viewerId}`);
      const storeFactory = createViewerStore(viewerId);
      store = storeFactory();
      _viewerStores.value.set(viewerId, store);
    } else {
      console.log(`[ViewerManager] Reusing existing viewer: ${viewerId}`);
    }

    return store as ViewerStore;
  }

  function getViewer(viewerId: string): ViewerStore {
    const store = _viewerStores.value.get(viewerId);

    if (!store) {
      throw new Error(
        `[ViewerManager] Viewer not found: ${viewerId}. Create it first with createViewer().`
      );
    }

    return store as ViewerStore;
  }

  function disposeViewer(viewerId: string): void {
    const store = _viewerStores.value.get(viewerId);

    if (store) {
      console.log(`[ViewerManager] Disposing viewer: ${viewerId}`);
      store.dispose();
      _viewerStores.value.delete(viewerId);
    } else {
      console.warn(
        `[ViewerManager] Viewer not found for disposal: ${viewerId}`
      );
    }
  }

  function disposeAllViewers(): void {
    console.log(
      `[ViewerManager] Disposing all viewers (${_viewerStores.value.size})`
    );

    _viewerStores.value.forEach((store, viewerId) => {
      console.log(`[ViewerManager] Disposing viewer: ${viewerId}`);
      store.dispose();
    });

    _viewerStores.value.clear();
  }

  function getViewersInfo() {
    const viewers: Array<{
      viewerId: string;
      hasModel: boolean;
      isLoading: boolean;
    }> = [];

    _viewerStores.value.forEach((store) => {
      viewers.push({
        viewerId: store.viewerId,
        hasModel: !!store.modelManager.model,
        isLoading: !!store.modelManager.isLoading,
      });
    });

    return viewers;
  }

  return {
    activeViewersCount,
    activeViewerIds,
    hasViewer,
    createViewer,
    getViewer,
    disposeViewer,
    disposeAllViewers,
    getViewersInfo,
  };
});
