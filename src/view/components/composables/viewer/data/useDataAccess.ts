import { computed, shallowRef } from "vue";
import * as OBC from "@thatopen/components";
import {
  FragmentsModel,
  ItemAttribute,
  ItemData,
  LodMode,
  SpatialStructure,
} from "@thatopen/fragments";
import * as THREE from "three";
import * as FRAGS from "@thatopen/fragments";
import * as OBF from "@thatopen/components-front";

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

export interface IEmployeeViewerDataAccess {
  formatItemPsets: (
    rawPsets: FRAGS.ItemData[]
  ) => Record<string, Record<string, any>>;
  getPropertySet: (
    localId: number,
    model: FragmentsModel
  ) => Promise<Record<string, Record<string, any>>>;
  getEntitiesByLocalId: (
    localIds: number[],
    model: FragmentsModel,
    config?: Partial<FRAGS.ItemsDataConfig>
  ) => Promise<ItemData[] | null>;
  getEntityByLocalId: (
    localId: number,
    model: FragmentsModel,
    config?: Partial<FRAGS.ItemsDataConfig>
  ) => Promise<ItemData | null>;
  getSpatialStructure: (
    model: FragmentsModel
  ) => Promise<FRAGS.SpatialTreeItem>;
  getLevels: (model: FragmentsModel) => Promise<LevelsViewData[]>;
}

export const useDataAccess = (): IEmployeeViewerDataAccess => {
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

  const getItemPropertySets = async (
    localId: number,
    model: FragmentsModel
  ) => {
    if (!localId) return null;
    const [data] = await model.getItemsData([localId], {
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

  const getSpatialStructure = async (model: FragmentsModel) => {
    const result = await model.getSpatialStructure();
    return result;
  };

  const getPropertySet = async (
    localId: number,
    model: FragmentsModel
  ): Promise<Record<string, Record<string, any>>> => {
    const pgsets = await getItemPropertySets(localId, model);
    return formatItemPsets(pgsets ?? []);
  };

  const getEntitiesByLocalId = async (
    localIds: number[],
    model: FragmentsModel,
    config?: Partial<FRAGS.ItemsDataConfig>
  ) => {
    const itemsData = await model.getItemsData(
      localIds,
      config ?? defaultItemsDataConfig
    );

    if (itemsData && itemsData.length > 0) {
      return itemsData;
    }
    return null;
  };

  const getEntityByLocalId = async (
    localId: number,
    model: FragmentsModel,
    config?: Partial<FRAGS.ItemsDataConfig>
  ) => {
    const itemsData = await getEntitiesByLocalId(
      [localId],
      model,
      config ?? defaultItemsDataConfig
    );
    if (itemsData && itemsData.length > 0) {
      return itemsData[0];
    }
    return null;
  };

  const getLevels = async (model: FragmentsModel) => {
    let levelsViewData: LevelsViewData[] = [];

    if (model) {
      const storeyItems = await model.getItemsOfCategories([
        /IFCBUILDINGSTOREY/,
      ]);
      const storeyIds = Object.values(storeyItems).flat();

      console.log("Found levels (localId):", storeyIds);

      if (storeyIds.length > 0) {
        const storeyData = await model.getItemsData(storeyIds, {
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

  return {
    formatItemPsets,
    getPropertySet,

    getEntitiesByLocalId,
    getEntityByLocalId,

    getSpatialStructure,

    getLevels,
  };
};
