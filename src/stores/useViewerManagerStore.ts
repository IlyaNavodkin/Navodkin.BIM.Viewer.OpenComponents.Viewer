import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { createViewerStore, type ViewerStore } from "./useViewerCoreStore";

/**
 * Стор для централизованного управления всеми экземплярами вьюверов
 * Инкапсулирует создание, получение и удаление сторов вьюверов
 */
export const useViewerManagerStore = defineStore("viewerManager", () => {
  // ========================================
  // STATE
  // ========================================

  // Реестр всех активных сторов вьюверов
  // Используем any для внутреннего хранения, чтобы избежать конфликтов с внутренними типами Pinia
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const _viewerStores = ref(new Map<string, any>());

  // ========================================
  // COMPUTED
  // ========================================

  /**
   * Количество активных вьюверов
   */
  const activeViewersCount = computed(() => _viewerStores.value.size);

  /**
   * Список ID всех активных вьюверов
   */
  const activeViewerIds = computed(() =>
    Array.from(_viewerStores.value.keys())
  );

  /**
   * Проверяет существует ли вьювер с указанным ID
   */
  const hasViewer = computed(() => {
    return (viewerId: string) => _viewerStores.value.has(viewerId);
  });

  // ========================================
  // ACTIONS
  // ========================================

  /**
   * Создает новый стор для вьювера
   * Если стор уже существует - возвращает существующий
   */
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

  /**
   * Получает существующий стор вьювера
   * Бросает ошибку если стор не найден
   */
  function getViewer(viewerId: string): ViewerStore {
    const store = _viewerStores.value.get(viewerId);

    if (!store) {
      throw new Error(
        `[ViewerManager] Viewer not found: ${viewerId}. Create it first with createViewer().`
      );
    }

    return store as ViewerStore;
  }

  /**
   * Удаляет стор вьювера и освобождает ресурсы
   */
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

  /**
   * Удаляет все вьюверы и освобождает все ресурсы
   */
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

  /**
   * Получает информацию о всех активных вьюверах (для отладки)
   */
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

  // ========================================
  // RETURN
  // ========================================

  return {
    // Computed
    activeViewersCount,
    activeViewerIds,
    hasViewer,

    // Actions
    createViewer,
    getViewer,
    disposeViewer,
    disposeAllViewers,
    getViewersInfo,
  };
});
