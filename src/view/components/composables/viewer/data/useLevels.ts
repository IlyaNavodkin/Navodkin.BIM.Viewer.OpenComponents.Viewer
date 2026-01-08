import { useDataAccess } from "./useDataAccess";
import { useIFCViewerStore } from "@/stores/useViewerCoreStore";

export interface ILevels {
  loadLevels: (modelId: string) => Promise<void>;
  clear: () => void;
}

export const useLevels = (): ILevels => {
  const { getLevels } = useDataAccess();
  const store = useIFCViewerStore();

  const loadLevels = async (modelId: string) => {
    try {
      store.setLevelsLoading(true);
      store.setLevels([]);

      const levels = await getLevels(modelId);
      const sortedLevels = levels.sort((a, b) => a.elevation - b.elevation);
      store.setLevels(sortedLevels);

      console.log(
        `Loaded levels: ${store.features.elementsData.levels.data.length}`
      );
    } catch (error) {
      console.error("Error loading levels:", error);
      store.setLevels([]);
    } finally {
      store.setLevelsLoading(false);
    }
  };

  const clear = () => {
    store.clearLevels();
  };

  return {
    loadLevels,
    clear,
  };
};
