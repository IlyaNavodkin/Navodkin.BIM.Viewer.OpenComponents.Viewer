import { ref, shallowRef } from "vue";
import { defineStore } from "pinia";
import * as OBC from "@thatopen/components";
import { FragmentsModel } from "@thatopen/fragments";
import * as OBF from "@thatopen/components-front";
import {
  LevelsViewData,
  EmployeeWorkplaceViewData,
} from "@/view/components/composables/viewer/data/useDataAccess";

export const useIFCViewerStore = defineStore("ifcViewer", () => {
  const core = {
    container: ref<HTMLDivElement | undefined>(undefined),
    components: shallowRef<OBC.Components | undefined>(undefined),
    words: shallowRef<OBC.Worlds | undefined>(undefined),
    currentWord: shallowRef<
      | OBC.SimpleWorld<
          OBC.SimpleScene,
          OBC.SimpleCamera,
          OBF.PostproductionRenderer
        >
      | undefined
    >(undefined),
    workerUrl: ref<string | undefined>(undefined),
  };

  const modelManager = {
    ifcLoader: shallowRef<OBC.IfcLoader | undefined>(undefined),
    model: shallowRef<FragmentsModel | undefined>(undefined),
    fragmentManager: shallowRef<OBC.FragmentsManager | undefined>(undefined),
    hider: shallowRef<OBC.Hider | undefined>(undefined),
    finder: shallowRef<OBC.ItemsFinder | undefined>(undefined),
    isLoading: ref(false),
    loadingProgress: ref(0),
  };

  const features = {
    clip: {
      clipper: shallowRef<OBC.Clipper | undefined>(undefined),
      clipStyler: shallowRef<OBF.ClipStyler | undefined>(undefined),
    },
    selection: {
      highlighter: shallowRef<OBF.Highlighter | undefined>(undefined),
      allPlacementsOutliner: shallowRef<OBF.Outliner | undefined>(undefined),
      currentHoveredElement: ref<
        { modelId: string; localId: number } | undefined
      >(undefined),
      currentSelectedElement: ref<
        { modelId: string; localId: number } | undefined
      >(undefined),
    },
    elementsData: {
      levels: {
        data: shallowRef<LevelsViewData[]>([]),
        isLoading: ref(false),
      },
      employeeWorkplaces: {
        data: shallowRef<EmployeeWorkplaceViewData[]>([]),
        isLoading: ref(false),
      },
    },
  };

  function setIsLoading(value: boolean) {
    modelManager.isLoading.value = value;
  }

  function setLoadingProgress(value: number) {
    modelManager.loadingProgress.value = value;
  }

  function reset() {
    core.container.value = undefined;
    core.components.value = undefined;
    core.words.value = undefined;
    core.currentWord.value = undefined;
    core.workerUrl.value = undefined;

    modelManager.ifcLoader.value = undefined;
    modelManager.model.value = undefined;
    modelManager.fragmentManager.value = undefined;
    modelManager.hider.value = undefined;
    modelManager.finder.value = undefined;
    modelManager.isLoading.value = false;
    modelManager.loadingProgress.value = 0;

    features.clip.clipper.value = undefined;
    features.clip.clipStyler.value = undefined;
    features.selection.highlighter.value = undefined;
    features.selection.allPlacementsOutliner.value = undefined;
    features.selection.currentHoveredElement.value = undefined;
    features.selection.currentSelectedElement.value = undefined;
  }

  return {
    core,
    modelManager,
    features,
    setIsLoading,
    setLoadingProgress,
    reset,
  };
});
