import { computed, shallowRef } from "vue";
import * as OBC from "@thatopen/components";
import {
  FragmentsModel,
  ItemAttribute,
  ItemData,
  LodMode,
} from "@thatopen/fragments";
import * as THREE from "three";
import * as FRAGS from "@thatopen/fragments";
import * as OBF from "@thatopen/components-front";

/**
 * Типы для Property Sets и Properties
 */
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

/**
 * Данные уровня (IfcBuildingStorey)
 */
export type LevelsViewData = {
  name: string;
  elevation: number;
  localId: number;
};

/**
 * Низкоуровневая работа с данными модели
 * Отвечает за получение и форматирование данных элементов, property sets, levels
 */
export const useDataAccess = () => {
  /**
   * Форматирует Property Sets в удобный формат
   * @param rawPsets - сырые данные Property Sets
   * @returns Отформатированные Property Sets
   */
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

  /**
   * Получает Property Sets элемента
   * @param localId - локальный идентификатор элемента
   * @param model - модель
   * @returns Property Sets элемента или null
   */
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

  /**
   * Конфигурация по умолчанию для получения данных элементов
   */
  const defaultItemsDataConfig: Partial<FRAGS.ItemsDataConfig> = {
    attributesDefault: false,
    relations: {
      IsDefinedBy: { attributes: true, relations: true },
      DefinesOcurrence: { attributes: true, relations: true },
    },
  };

  /**
   * Получает пространственную структуру модели
   * @param model - модель
   * @returns Пространственная структура
   */
  const getSpatialStructure = async (model: FragmentsModel) => {
    const result = await model.getSpatialStructure();
    return result;
  };

  /**
   * Получает Property Set элемента в отформатированном виде
   * @param localId - локальный идентификатор элемента
   * @param model - модель
   * @returns Отформатированные Property Sets
   */
  const getPropertySet = async (localId: number, model: FragmentsModel) => {
    const pgsets = await getItemPropertySets(localId, model);
    return formatItemPsets(pgsets ?? []);
  };

  /**
   * Получает данные сущностей по их localIds
   * @param localIds - массив локальных идентификаторов
   * @param model - модель
   * @param config - конфигурация для получения данных (опционально)
   * @returns Данные сущностей или null
   */
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

  /**
   * Получает данные сущности по её localId
   * @param localId - локальный идентификатор элемента
   * @param model - модель
   * @param config - конфигурация для получения данных (опционально)
   * @returns Данные сущности или null
   */
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

  /**
   * Получает уровни (IfcBuildingStorey) из модели
   * @param model - модель
   * @returns Массив данных уровней
   */
  const getLevels = async (model: FragmentsModel) => {
    let levelsViewData: LevelsViewData[] = [];

    if (model) {
      const storeyItems = await model.getItemsOfCategories([
        /IFCBUILDINGSTOREY/,
      ]);
      const storeyIds = Object.values(storeyItems).flat();

      console.log("Найденные уровни (localId):", storeyIds);

      if (storeyIds.length > 0) {
        const storeyData = await model.getItemsData(storeyIds, {
          attributesDefault: true,
        });
        console.log("Данные уровней:", storeyData);

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
