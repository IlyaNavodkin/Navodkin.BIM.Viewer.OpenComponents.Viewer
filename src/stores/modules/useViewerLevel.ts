import { ref, computed, shallowRef } from "vue";
import type { LevelsViewData } from "@/view/components/composables/viewer/data/useDataAccess";

export function createLevelModule() {

  const _levels = shallowRef<LevelsViewData[]>([]);
  const _levelsLoading = ref(false);

  const api = computed(() => ({
    data: _levels.value,
    isLoading: _levelsLoading.value,
    setData: (levels: LevelsViewData[]) => {
      _levels.value = levels;
    },

    setLoading: (loading: boolean) => {
      _levelsLoading.value = loading;
    },

    update: (levels: LevelsViewData[], loading: boolean = false) => {
      _levels.value = levels;
      _levelsLoading.value = loading;
    },

    clear: () => {
      _levels.value = [];
      _levelsLoading.value = false;
    },
  }));

  return api;
}
