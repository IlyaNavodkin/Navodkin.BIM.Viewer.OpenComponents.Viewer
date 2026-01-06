import { useDataAccess } from "./useDataAccess";
import * as OBC from "@thatopen/components";
import { useIFCViewerStore } from "@/stores/useViewerCoreStore";

export interface IEmployeeViewerModelData {
  loadLevels: (modelId: string) => Promise<void>;
  loadEmployeeWorkplaces: (modelId: string) => Promise<void>;
  getElementInfo: (modelId: string, localId: number) => Promise<any>;
  getEntityData: (modelId: string, localId: number) => Promise<any>;
  clear: () => void;
  toMapData: (modelId: string, localIds: number[]) => OBC.ModelIdMap;
}

export const useModelData = (): IEmployeeViewerModelData => {
  const { getLevels, getEmployeeWorkplaces, getEntityByLocalId } =
    useDataAccess();

  const store = useIFCViewerStore();

  const loadLevels = async (modelId: string) => {
    try {
      store.features.elementsData.levels.isLoading = true;
      store.features.elementsData.levels.data = [];

      const levels = await getLevels(modelId);
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

  const loadEmployeeWorkplaces = async (modelId: string) => {
    try {
      store.features.elementsData.employeeWorkplaces.isLoading = true;
      store.features.elementsData.employeeWorkplaces.data = [];

      const workplaces = await getEmployeeWorkplaces(modelId);
      store.features.elementsData.employeeWorkplaces.data = workplaces;

      console.log(
        `Loaded employee workplaces: ${store.features.elementsData.employeeWorkplaces.data.length}`
      );
    } catch (error) {
      console.error("Error loading employee workplaces:", error);
      store.features.elementsData.employeeWorkplaces.data = [];
    } finally {
      store.features.elementsData.employeeWorkplaces.isLoading = false;
    }
  };

  const clear = () => {
    store.features.elementsData.levels.data = [];
    store.features.elementsData.levels.isLoading = false;
    store.features.elementsData.employeeWorkplaces.data = [];
    store.features.elementsData.employeeWorkplaces.isLoading = false;
  };

  const getElementInfo = async (
    modelId: string,
    localId: number
  ): Promise<any> => {
    try {
      const modelFromId = store.modelManager.fragmentManager?.list.get(
        modelId.toString()
      );
      if (!modelFromId) {
        throw new Error(`Model not found for modelId: ${modelId}`);
      }

      const itemsData = await modelFromId.getItemsData([localId], {
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

  const toMapData = (modelId: string, localIds: number[]) => {
    const modelIdMap: OBC.ModelIdMap = {
      [modelId]: new Set(localIds),
    };
    return modelIdMap;
  };

  const getEntityData = async (
    modelId: string,
    localId: number
  ): Promise<any> => {
    return await getEntityByLocalId(localId, modelId);
  };

  return {
    loadLevels,
    loadEmployeeWorkplaces,
    getElementInfo,
    getEntityData,
    clear,
    toMapData,
  };
};
