import { defineStore } from "pinia";
import { computed, ref } from "vue";

export type WorkplaceMarkerClickHandler = (localId: number) => void | Promise<void>;

export const useEmployeeWorkplaceStore = defineStore("employeeWorkplace", () => {
  // --- Маркеры рабочих мест ---
  const markerSelectedLocalId = ref<number | null>(null);
  const markerVisibility = ref<Record<number, boolean>>({});

  // callback, который прокидывает «клик по маркеру» обратно в доменное место (менеджер)
  const markerClickHandler = ref<WorkplaceMarkerClickHandler | null>(null);

  const isSelected = (localId: number) => markerSelectedLocalId.value === localId;

  const select = (localId: number) => {
    markerSelectedLocalId.value = localId;
  };

  const clearSelection = () => {
    markerSelectedLocalId.value = null;
  };

  const setVisibility = (localId: number, visible: boolean) => {
    markerVisibility.value = { ...markerVisibility.value, [localId]: visible };
  };

  const isVisible = (localId: number) => {
    // по умолчанию считаем маркер видимым, если явно не скрывали
    return markerVisibility.value[localId] !== false;
  };

  const clear = () => {
    markerSelectedLocalId.value = null;
    markerVisibility.value = {};
  };

  const setClickHandler = (handler: WorkplaceMarkerClickHandler | null) => {
    markerClickHandler.value = handler;
  };

  const handleClick = async (localId: number) => {
    await markerClickHandler.value?.(localId);
  };

  const markers = {
    selectedLocalId: computed(() => markerSelectedLocalId.value),
    isSelected,
    select,
    clearSelection,
    setVisibility,
    isVisible,
    clear,
    setClickHandler,
    handleClick,
  };

  return {
    markers,
  };
});

