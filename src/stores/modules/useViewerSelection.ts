import { ref, computed, shallowRef } from "vue";
import * as OBF from "@thatopen/components-front";

export function createSelectionModule() {

  const _outliner = shallowRef<OBF.Outliner | undefined>(undefined);
  const _highlightedElement = ref<
    { modelId: string; localId: number } | undefined
  >(undefined);

  const api = computed(() => ({
    outliner: _outliner.value,
    highlightedElement: _highlightedElement.value,
    setOutliner: (outliner: OBF.Outliner | undefined) => {
      _outliner.value = outliner;
    },

    setHighlightedElement: (
      element: { modelId: string; localId: number } | undefined
    ) => {
      _highlightedElement.value = element;
    },

    initialize: (outliner: OBF.Outliner) => {
      _outliner.value = outliner;
    },

    clear: () => {
      _outliner.value = undefined;
      _highlightedElement.value = undefined;
    },
  }));

  return api;
}
