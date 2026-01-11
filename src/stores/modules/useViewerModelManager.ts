import { ref, computed, shallowRef } from "vue";
import * as OBC from "@thatopen/components";
import { FragmentsModel } from "@thatopen/fragments";

export function createModelManagerModule() {
  const _ifcLoader = shallowRef<OBC.IfcLoader | undefined>(undefined);
  const _model = shallowRef<FragmentsModel | undefined>(undefined);
  const _fragmentManager = shallowRef<OBC.FragmentsManager | undefined>(
    undefined
  );
  const _hider = shallowRef<OBC.Hider | undefined>(undefined);
  const _finder = shallowRef<OBC.ItemsFinder | undefined>(undefined);
  const _isLoading = ref(false);
  const _loadingProgress = ref(0);

  const api = computed(() => ({
    ifcLoader: _ifcLoader.value,
    model: _model.value,
    fragmentManager: _fragmentManager.value,
    hider: _hider.value,
    finder: _finder.value,
    isLoading: _isLoading.value,
    loadingProgress: _loadingProgress.value,
    setIfcLoader: (loader: OBC.IfcLoader | undefined) => {
      _ifcLoader.value = loader;
    },

    setModel: (model: FragmentsModel | undefined) => {
      _model.value = model;
    },

    setFragmentManager: (manager: OBC.FragmentsManager | undefined) => {
      _fragmentManager.value = manager;
    },

    setHider: (hider: OBC.Hider | undefined) => {
      _hider.value = hider;
    },

    setFinder: (finder: OBC.ItemsFinder | undefined) => {
      _finder.value = finder;
    },

    setIsLoading: (value: boolean) => {
      _isLoading.value = value;
    },

    setLoadingProgress: (value: number) => {
      const clampedValue = Math.min(100, Math.max(0, value));
      _loadingProgress.value = clampedValue;
    },

    initialize: (
      ifcLoader: OBC.IfcLoader,
      fragmentManager: OBC.FragmentsManager,
      hider: OBC.Hider,
      finder: OBC.ItemsFinder
    ) => {
      _ifcLoader.value = ifcLoader;
      _fragmentManager.value = fragmentManager;
      _hider.value = hider;
      _finder.value = finder;
    },

    clear: () => {
      _ifcLoader.value = undefined;
      _model.value = undefined;
      _fragmentManager.value = undefined;
      _hider.value = undefined;
      _finder.value = undefined;
      _isLoading.value = false;
      _loadingProgress.value = 0;
    },
  }));

  return api;
}
