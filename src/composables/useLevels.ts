import { ref, type Ref } from "vue";
import { IDataAccessManager, useDataAccessManager } from "./useDataAccess";
import { ItemAttribute, ItemData } from "@thatopen/fragments";

export type LevelsViewData = {
  name: string;
  elevation: number;
  localId: number;
};

export interface ILevelManager {
  loadLevels: (modelId: string) => Promise<void>;
  clearLevels: () => void;
  fileLevels: Ref<LevelsViewData[]>;
  isLoading: Ref<boolean>;
}

export const useLevels = (dataAccessManager: IDataAccessManager): ILevelManager => {
  const fileLevels = ref<LevelsViewData[]>([]);
  const isLoading = ref(false);

  const getLevels = async (modelId: string) => {
    const modelFromId = dataAccessManager.getModels().find((model) => model.modelId === modelId);
    if (!modelFromId) {
      throw new Error(`Model not found for modelId: ${modelId}`);
    }

    let levelsViewData: LevelsViewData[] = [];

    if (modelFromId) {
      const storeyItems = await modelFromId.getItemsOfCategories([
        /IFCBUILDINGSTOREY/,
      ]);
      const storeyIds = Object.values(storeyItems).flat();

      console.log("Found levels (localId):", storeyIds);

      if (storeyIds.length > 0) {
        const storeyData = await modelFromId.getItemsData(storeyIds, {
          attributesDefault: true,
        });
        console.log("Level data:", storeyData);

        levelsViewData = storeyData.map((item: ItemData) => {
          const nameattr = item.Name as ItemAttribute;
          const elevationattr = item.Elevation as ItemAttribute;
          const localIdattr = item._localId as ItemAttribute;

          return {
            name: nameattr.value,
            elevation: elevationattr.value,
            localId: localIdattr.value,
          };
        });
      }
    }

    return levelsViewData;
  };


  const loadLevels = async (modelId: string) => {
    try {
      isLoading.value = true;

      const levels = await getLevels(modelId);
      const sortedLevels = levels.sort((a, b) => a.elevation - b.elevation);
      fileLevels.value = sortedLevels;

      console.log(`Loaded levels: ${fileLevels.value.length}`);
    } catch (error) {
      console.error("Error loading levels:", error);
      fileLevels.value = []
    } finally {
      isLoading.value = false;
    }
  };

  const clearLevels = () => {
    fileLevels.value = []
  };

  return {
    loadLevels,
    clearLevels,

    fileLevels,
    isLoading,
  };
};
