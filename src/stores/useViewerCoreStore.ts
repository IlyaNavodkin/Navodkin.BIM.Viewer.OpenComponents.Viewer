import { computed } from "vue";
import { defineStore } from "pinia";
import { createViewerCoreModule } from "./modules/useViewerCore";
import { createModelManagerModule } from "./modules/useViewerModelManager";
import { createSelectionModule } from "./modules/useViewerSelection";
import { createLevelModule } from "./modules/useViewerLevel";
import { createEmployeeWorkplaceModule } from "./modules/useViewerEmployeeWorkplace";

export const createViewerStore = (viewerId: string) => {
  return defineStore(`ifcViewer-${viewerId}`, () => {
    const core = createViewerCoreModule();
    const modelManager = createModelManagerModule();
    const selection = createSelectionModule();
    const level = createLevelModule();
    const employeeWorkplace = createEmployeeWorkplaceModule();

    const features = computed(() => ({
      selection: selection.value,
      level: level.value,
      employeeWorkplace: employeeWorkplace.value,
    }));

    function reset() {
      core.value.clear();
      modelManager.value.clear();
      selection.value.clear();
      level.value.clear();
      employeeWorkplace.value.clearAll();
    }

    function dispose() {
      console.log(`[ViewerStore ${viewerId}] Disposing...`);

      reset();

      console.log(`[ViewerStore ${viewerId}] Disposed successfully`);
    }

    return {
      viewerId,
      core,
      modelManager,
      features,
      reset,
      dispose,
    };
  });
};

export type ViewerStore = ReturnType<ReturnType<typeof createViewerStore>>;
