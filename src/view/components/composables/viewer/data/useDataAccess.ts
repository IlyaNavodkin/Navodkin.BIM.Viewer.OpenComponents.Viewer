import { ItemAttribute, ItemData } from "@thatopen/fragments";
import * as FRAGS from "@thatopen/fragments";
import { useViewerManagerStore } from "@/stores/useViewerManagerStore";

export type PropertySet = {
  name: string;
  properties: Property[];
  localId: number;
  category: string;
};

export type PropertyName = {
  value: string;
  type: string;
};

export type PropertyNominalValue = {
  value: string | number | boolean | null;
  type: string;
};

export type Property = {
  name: string;
  nominalValue: any;
  category: string;
  id: number;
};

export type LevelsViewData = {
  name: string;
  elevation: number;
  localId: number;
};

export type EmployeeWorkplaceViewData = {
  localId: number;
  category: string;
  workplaceNumber: string;
  level: LevelsViewData | null;
};

export type EntityData = {
  category: string;
  localId: number;
};

export interface IEmployeeViewerDataAccess {
  formatItemPsets: (
    rawPsets: FRAGS.ItemData[]
  ) => Record<string, Record<string, any>>;
  getPropertySet: (
    localId: number,
    modelId: string
  ) => Promise<Record<string, Record<string, any>>>;
  getEntitiesByLocalId: (
    localIds: number[],
    modelId: string,
    config?: Partial<FRAGS.ItemsDataConfig>
  ) => Promise<EntityData[] | null>;
  getEntityByLocalId: (
    localId: number,
    modelId: string,
    config?: Partial<FRAGS.ItemsDataConfig>
  ) => Promise<EntityData | null>;
  getSpatialStructure: (modelId: string) => Promise<FRAGS.SpatialTreeItem>;
  getLevels: (modelId: string) => Promise<LevelsViewData[]>;
  getEmployeeWorkplaces: (
    modelId: string,
    levels: LevelsViewData[]
  ) => Promise<EmployeeWorkplaceViewData[]>;
  getElementInfo: (modelId: string, localId: number) => Promise<any>;
}

const constrantGroupName = "Constraints";
const identityGroupName = "Identity Data";
const levelPrefix = "Level: ";

export const useDataAccess = (viewerId: string): IEmployeeViewerDataAccess => {
  const viewerManager = useViewerManagerStore();
  const store = viewerManager.getViewer(viewerId);
  const formatItemPsets = (rawPsets: FRAGS.ItemData[]) => {
    const result: Record<string, Record<string, any>> = {};

    const entries = Object.entries(rawPsets);
    for (const [_, pset] of entries) {
      const { Name: psetName, HasProperties } = pset;
      if (!("value" in psetName && Array.isArray(HasProperties))) continue;
      const props: Record<string, any> = {};
      const propsEntries = Object.entries(HasProperties);
      for (const [_, prop] of propsEntries) {
        const { Name, NominalValue } = prop;
        if (!("value" in Name && "value" in NominalValue)) continue;
        const name = Name.value;
        const nominalValue = NominalValue.value;
        if (!(name && nominalValue !== undefined)) continue;
        props[name] = nominalValue;
      }
      result[psetName.value] = props;
    }
    return result;
  };

  const getItemPropertySets = async (localId: number, modelId: string) => {
    if (!localId) return null;
    const modelFromId = store.modelManager.fragmentManager?.list.get(modelId);
    if (!modelFromId) {
      throw new Error(`Model not found for modelId: ${modelId}`);
    }
    const [data] = await modelFromId.getItemsData([localId], {
      attributesDefault: false,
      attributes: ["Name", "NominalValue"],
      relations: {
        IsDefinedBy: { attributes: true, relations: true },
        DefinesOcurrence: { attributes: false, relations: false },
      },
    });
    return (data.IsDefinedBy as FRAGS.ItemData[]) ?? [];
  };

  const defaultItemsDataConfig: Partial<FRAGS.ItemsDataConfig> = {
    attributesDefault: false,
    relations: {
      IsDefinedBy: { attributes: true, relations: true },
      DefinesOcurrence: { attributes: true, relations: true },
    },
  };

  const getSpatialStructure = async (modelId: string) => {
    const modelFromId = store.modelManager.fragmentManager?.list.get(
      modelId.toString()
    );
    if (!modelFromId) {
      throw new Error(`Model not found for modelId: ${modelId}`);
    }
    const result = await modelFromId.getSpatialStructure();
    return result;
  };

  const getPropertySet = async (
    localId: number,
    modelId: string
  ): Promise<Record<string, Record<string, any>>> => {
    const pgsets = await getItemPropertySets(localId, modelId);
    return formatItemPsets(pgsets ?? []);
  };

  const getEntitiesByLocalId = async (
    localIds: number[],
    modelId: string,
    config?: Partial<FRAGS.ItemsDataConfig>
  ): Promise<EntityData[] | null> => {
    const modelFromId = store.modelManager.fragmentManager?.list.get(modelId);
    if (!modelFromId) {
      throw new Error(`Model not found for modelId: ${modelId}`);
    }
    const itemsData = await modelFromId.getItemsData(
      localIds,
      config ?? defaultItemsDataConfig
    );

    if (itemsData && itemsData.length > 0) {
      return itemsData.map((item: ItemData) => ({
        category: (item._category as ItemAttribute)?.value?.toString() ?? "",
        localId: ((item._localId as ItemAttribute)?.value as number) ?? 0,
      }));
    }
    return null;
  };

  const getEntityByLocalId = async (
    localId: number,
    modelId: string,
    config?: Partial<FRAGS.ItemsDataConfig>
  ): Promise<EntityData | null> => {
    const modelFromId = store.modelManager.fragmentManager?.list.get(modelId);
    if (!modelFromId) {
      throw new Error(`Model not found for modelId: ${modelId}`);
    }
    const entities = await getEntitiesByLocalId(
      [localId],
      modelId,
      config ?? defaultItemsDataConfig
    );

    return entities?.[0] ?? null;
  };

  const getLevels = async (modelId: string) => {
    const modelFromId = store.modelManager.fragmentManager?.list.get(modelId);
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

  const getEmployeeWorkplaces = async (
    modelId: string,
    levels: LevelsViewData[]
  ) => {
    const modelFromId = store.modelManager.fragmentManager?.list.get(modelId);
    if (!modelFromId) {
      throw new Error(`Model not found for modelId: ${modelId}`);
    }
    let workplacesViewData: EmployeeWorkplaceViewData[] = [];

    if (modelFromId) {
      const workplaceItems = await modelFromId.getItemsOfCategories([
        /IFCFURNISHINGELEMENT/,
      ]);
      const workplaceIds = Object.values(workplaceItems).flat();

      console.log("Found employee workplaces (localId):", workplaceIds);

      if (workplaceIds.length > 0) {
        const workplaceData = await modelFromId.getItemsData(workplaceIds, {
          attributesDefault: true,
        });
        console.log("Employee workplace data:", workplaceData);

        for (const item of workplaceData) {
          console.log("Item:", item);
          const properties = await getPropertySet(
            (item._localId as ItemAttribute)?.value as number,
            modelId
          );
          console.log("Properties:", properties);
          const workplaceNumber = properties[identityGroupName]?.Comments;
          const levelName = properties[constrantGroupName]?.Level;
          const levelsNameWithoutPrefix = levelName?.replace(levelPrefix, "");

          if (workplaceNumber) {
            // Находим соответствующий уровень по имени
            const levelData = levelsNameWithoutPrefix
              ? levels.find((l) => l.name === levelsNameWithoutPrefix) ?? null
              : null;

            workplacesViewData.push({
              localId: (item._localId as ItemAttribute)?.value as number,
              category:
                (item._category as ItemAttribute)?.value?.toString() ?? "",
              workplaceNumber: workplaceNumber,
              level: levelData,
            });
          }
        }
      }
    }

    return workplacesViewData;
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

  return {
    formatItemPsets,
    getPropertySet,

    getEntitiesByLocalId,
    getEntityByLocalId,

    getSpatialStructure,

    getLevels,
    getEmployeeWorkplaces,
    getElementInfo,
  };
};
