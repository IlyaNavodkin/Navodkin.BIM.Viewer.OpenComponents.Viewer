import { ItemAttribute, ItemData } from "@thatopen/fragments";
import * as FRAGS from "@thatopen/fragments";
import * as OBC from "@thatopen/components";
import { useEmployeeStore } from "../stores/employeeStore";



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


export type EntityData = {
  category: string;
  localId: number;
};

export interface IDataAccessManager {
  formatItemPsets: (
    rawPsets: FRAGS.ItemData[],
  ) => Record<string, Record<string, any>>;
  getPropertySet: (
    localId: number,
    modelId: string,
  ) => Promise<Record<string, Record<string, any>>>;
  getEntitiesByLocalId: (
    localIds: number[],
    modelId: string,
    config?: Partial<FRAGS.ItemsDataConfig>,
  ) => Promise<EntityData[] | null>;
  getEntityByLocalId: (
    localId: number,
    modelId: string,
    config?: Partial<FRAGS.ItemsDataConfig>,
  ) => Promise<EntityData | null>;
  getSpatialStructure: (modelId: string) => Promise<FRAGS.SpatialTreeItem>;
  getElementInfo: (modelId: string, localId: number) => Promise<any>;
  getFragmentModelByLocalId: (localId: number) => Promise<FRAGS.FragmentsModel | null>;
  getModels: () => FRAGS.FragmentsModel[];
}


export const useDataAccessManager = (fragmentManager: OBC.FragmentsManager): IDataAccessManager => {

  const getModels = () => {
    const modelsMap = fragmentManager.list.values();

    const arrayOfModels = Array.from(modelsMap);

    return arrayOfModels;
  };

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
    const modelFromId = getModels().find((model) => model.modelId === modelId);
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
    const modelFromId = getModels().find((model) => model.modelId === modelId);
    if (!modelFromId) {
      throw new Error(`Model not found for modelId: ${modelId}`);
    }
    const result = await modelFromId.getSpatialStructure();
    return result;
  };

  const getPropertySet = async (
    localId: number,
    modelId: string,
  ): Promise<Record<string, Record<string, any>>> => {
    const pgsets = await getItemPropertySets(localId, modelId);
    return formatItemPsets(pgsets ?? []);
  };

  const getEntitiesByLocalId = async (
    localIds: number[],
    modelId: string,
    config?: Partial<FRAGS.ItemsDataConfig>,
  ): Promise<EntityData[] | null> => {
    const modelFromId = getModels().find((model) => model.modelId === modelId);
    if (!modelFromId) {
      throw new Error(`Model not found for modelId: ${modelId}`);
    }
    const itemsData = await modelFromId.getItemsData(
      localIds,
      config ?? defaultItemsDataConfig,
    );

    if (itemsData && itemsData.length > 0) {
      return itemsData.map((item: ItemData) => ({
        category: (item._category as ItemAttribute)?.value?.toString() ?? "",
        localId: ((item._localId as ItemAttribute)?.value as number) ?? 0,
      }));
    }
    return null;
  };

  const getFragmentModelByLocalId = async (localId: number) => {
    const models = getModels();

    for (const model of models) {
      const entityById = await getEntityByLocalId(localId, model.modelId);

      if (entityById) return model;
    }

    return null;
  }

  const getEntityByLocalId = async (
    localId: number,
    modelId: string,
    config?: Partial<FRAGS.ItemsDataConfig>,
  ): Promise<EntityData | null> => {
    const modelFromId = getModels().find((model) => model.modelId === modelId);
    if (!modelFromId) {
      throw new Error(`Model not found for modelId: ${modelId}`);
    }
    const entities = await getEntitiesByLocalId(
      [localId],
      modelId,
      config ?? defaultItemsDataConfig,
    );

    return entities?.[0] ?? null;
  };

  const getElementInfo = async (
    modelId: string,
    localId: number,
  ): Promise<any> => {
    try {
      const modelFromId = getModels().find((model) => model.modelId === modelId);
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

    getModels,
    getElementInfo,

    getFragmentModelByLocalId
  };
};
