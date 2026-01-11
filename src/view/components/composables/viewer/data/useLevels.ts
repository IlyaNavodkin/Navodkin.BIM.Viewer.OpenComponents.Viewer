import { useDataAccess } from "./useDataAccess";
import { useViewerManagerStore } from "@/stores/useViewerManagerStore";

export interface ILevels {
  loadLevels: (modelId: string) => Promise<void>;
  clear: () => void;
}

export const useLevels = (viewerId: string): ILevels => {
  const { getLevels } = useDataAccess(viewerId);
  const viewerManager = useViewerManagerStore();
  const store = viewerManager.getViewer(viewerId);

  const loadLevels = async (modelId: string) => {
    try {
      store.features.level.setLoading(true);
      store.features.level.setData([]);

      const levels = await getLevels(modelId);
      const sortedLevels = levels.sort((a, b) => a.elevation - b.elevation);
      store.features.level.setData(sortedLevels);

      console.log(`Loaded levels: ${store.features.level.data.length}`);
    } catch (error) {
      console.error("Error loading levels:", error);
      store.features.level.setData([]);
    } finally {
      store.features.level.setLoading(false);
    }
  };

  const clear = () => {
    store.features.level.clear();
  };

  return {
    loadLevels,
    clear,
  };
};
