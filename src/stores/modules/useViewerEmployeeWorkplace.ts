import { ref, computed, shallowRef } from "vue";
import * as OBF from "@thatopen/components-front";
import type { WorkplaceCardData } from "@/view/components/viewport/WorkplaceCard.vue";

/**
 * Модуль для управления рабочими местами сотрудников
 * Объединяет данные карточек рабочих мест и маркеры
 */
export function createEmployeeWorkplaceModule() {
  // ========================================
  // STATE (приватные реактивные переменные)
  // ========================================

  // Workplace Cards Data
  const _workplaceCards = shallowRef<WorkplaceCardData[]>([]);
  const _workplaceCardsLoading = ref(false);

  // Markers
  const _markerManager = shallowRef<OBF.Marker | undefined>(undefined);
  const _markersVisible = ref(true);
  const _selectedMarkers = ref<Map<number, boolean>>(new Map());
  const _markerVisibility = ref<Map<number, boolean>>(new Map());
  const _onSelectCallback = ref<((localId: number) => void) | null>(null);

  // ========================================
  // COMPUTED API
  // ========================================

  const api = computed(() => ({
    // ===== WORKPLACE CARDS STATE =====
    workplaceCards: {
      data: _workplaceCards.value,
      isLoading: _workplaceCardsLoading.value,

      // Actions
      setData: (cards: WorkplaceCardData[]) => {
        _workplaceCards.value = cards;
      },

      setLoading: (loading: boolean) => {
        _workplaceCardsLoading.value = loading;
      },

      update: (cards: WorkplaceCardData[], loading: boolean = false) => {
        _workplaceCards.value = cards;
        _workplaceCardsLoading.value = loading;
      },

      clear: () => {
        _workplaceCards.value = [];
        _workplaceCardsLoading.value = false;
      },
    },

    // ===== MARKERS STATE =====
    markers: {
      markerManager: _markerManager.value,
      visible: _markersVisible.value,
      selectedMarkers: _selectedMarkers.value,
      markerVisibility: _markerVisibility.value,

      // Getters
      isSelected: (localId: number): boolean => {
        return _selectedMarkers.value.get(localId) ?? false;
      },

      isVisible: (localId: number): boolean => {
        return _markerVisibility.value.get(localId) ?? true;
      },

      getSelectedLocalIds: (): number[] => {
        const selected: number[] = [];
        _selectedMarkers.value.forEach((isSelected, localId) => {
          if (isSelected) selected.push(localId);
        });
        return selected;
      },

      // Actions
      setManager: (manager: OBF.Marker | undefined) => {
        _markerManager.value = manager;
      },

      setVisible: (visible: boolean) => {
        _markersVisible.value = visible;
      },

      initialize: (manager: OBF.Marker) => {
        _markerManager.value = manager;
      },

      select: (localId: number) => {
        console.log("🟣 Store: selecting marker", localId);
        _selectedMarkers.value.clear();
        _selectedMarkers.value.set(localId, true);
      },

      clearSelection: () => {
        console.log("🟣 Store: clearing marker selection");
        _selectedMarkers.value.clear();
      },

      toggleSelection: (localId: number) => {
        const currentState = _selectedMarkers.value.get(localId) ?? false;
        if (currentState) {
          _selectedMarkers.value.delete(localId);
        } else {
          _selectedMarkers.value.clear();
          _selectedMarkers.value.set(localId, true);
        }
      },

      setVisibility: (localId: number, visible: boolean) => {
        _markerVisibility.value.set(localId, visible);
      },

      handleClick: (localId: number) => {
        console.log("🟢 Store: marker clicked", localId);
        if (_onSelectCallback.value) {
          _onSelectCallback.value(localId);
        } else {
          console.warn("Store: onSelectCallback not set!");
        }
      },

      setOnSelectCallback: (callback: (localId: number) => void) => {
        _onSelectCallback.value = callback;
      },

      clear: () => {
        _markerManager.value = undefined;
        _markersVisible.value = true;
        _selectedMarkers.value.clear();
        _markerVisibility.value.clear();
      },
    },

    // ===== ОБЩИЕ МЕТОДЫ =====
    clearAll: () => {
      // Очищаем workplace cards
      _workplaceCards.value = [];
      _workplaceCardsLoading.value = false;

      // Очищаем markers
      _markerManager.value = undefined;
      _markersVisible.value = true;
      _selectedMarkers.value.clear();
      _markerVisibility.value.clear();
    },
  }));

  return api;
}
