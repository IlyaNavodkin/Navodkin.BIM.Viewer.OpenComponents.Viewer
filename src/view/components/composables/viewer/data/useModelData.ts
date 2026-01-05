import { ref } from "vue";
import { FragmentsModel } from "@thatopen/fragments";
import { useDataAccess, type LevelsViewData } from "./useDataAccess";
import * as OBC from "@thatopen/components";
import { useIFCViewerStore } from "@/stores/useViewerCoreStore";

export interface IEmployeeViewerModelData {
  loadLevels: (model: FragmentsModel) => Promise<void>;
  getElementInfo: (model: FragmentsModel, localId: number) => Promise<any>;
  getEntityData: (model: FragmentsModel, localId: number) => Promise<any>;
  clear: () => void;
  toMapData: (model: FragmentsModel, localIds: number[]) => OBC.ModelIdMap;
}

export const useModelData = (): IEmployeeViewerModelData => {
  const { getLevels, getEntityByLocalId } = useDataAccess();

  const store = useIFCViewerStore();

  const loadLevels = async (model: FragmentsModel) => {
    try {
      store.features.elementsData.levels.isLoading = true;
      store.features.elementsData.levels.data = [];

      const levels = await getLevels(model);
      store.features.elementsData.levels.data = levels.sort(
        (a, b) => a.elevation - b.elevation
      );

      console.log(
        `Loaded levels: ${store.features.elementsData.levels.data.length}`
      );
    } catch (error) {
      console.error("Error loading levels:", error);
      store.features.elementsData.levels.data = [];
    } finally {
      store.features.elementsData.levels.isLoading = false;
    }
  };

  const clear = () => {
    store.features.elementsData.levels.data = [];
    store.features.elementsData.levels.isLoading = false;
  };

  const getElementInfo = async (
    model: FragmentsModel,
    localId: number
  ): Promise<any> => {
    try {
      const itemsData = await model.getItemsData([localId], {
        attributesDefault: false,
        attributes: ["Name", "GlobalId", "Tag", "ObjectType"],
      });

      if (itemsData && itemsData.length > 0) {
        return itemsData[0];
      }
      return null;
    } catch (error) {
      console.error("Error getting element information:", error);
      return null;
    }
  };

  const toMapData = (model: FragmentsModel, localIds: number[]) => {
    const modelIdMap: OBC.ModelIdMap = {
      [model.modelId]: new Set(localIds),
    };
    return modelIdMap;
  };

  const getEntityData = async (
    model: FragmentsModel,
    localId: number
  ): Promise<any> => {
    return await getEntityByLocalId(localId, model);
  };

  return {
    loadLevels,
    getElementInfo,
    getEntityData,
    clear,
    toMapData,
  };
};
