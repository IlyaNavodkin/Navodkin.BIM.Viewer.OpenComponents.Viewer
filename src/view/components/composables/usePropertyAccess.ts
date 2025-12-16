import { computed, shallowRef } from "vue";
import * as OBC from "@thatopen/components";
import { FragmentsModel, LodMode } from "@thatopen/fragments";
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

export const usePropertyAccess = () => {
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

  const getPropertySet = async (localId: number, model: FragmentsModel) => {
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

  return {
    getPropertySet,

    getEntitiesByLocalId,
    getEntityByLocalId,
  };
};
