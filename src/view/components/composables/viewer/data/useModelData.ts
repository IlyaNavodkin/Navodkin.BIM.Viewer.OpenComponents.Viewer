import { ref } from "vue";
import { FragmentsModel } from "@thatopen/fragments";
import { useDataAccess, type LevelsViewData } from "./useDataAccess";

/**
 * Слой данных для работы с данными модели
 * Отвечает за загрузку и управление данными модели (элементы, уровни, property sets)
 */
export const useModelData = () => {
  const { getLevels, getEntityByLocalId } = useDataAccess();

  const levelsData = ref<LevelsViewData[]>([]);
  const isLoadingLevels = ref(false);

  /**
   * Загружает уровни (IfcBuildingStorey) из модели
   * @param model - модель для загрузки уровней
   */
  const loadLevels = async (model: FragmentsModel) => {
    try {
      isLoadingLevels.value = true;
      levelsData.value = [];

      const levels = await getLevels(model);
      levelsData.value = levels.sort((a, b) => a.elevation - b.elevation);

      console.log(`Загружено уровней: ${levelsData.value.length}`);
    } catch (error) {
      console.error("Ошибка при загрузке уровней:", error);
      levelsData.value = [];
    } finally {
      isLoadingLevels.value = false;
    }
  };

  /**
   * Получает информацию об элементе по его localId
   * @param model - модель
   * @param localId - локальный идентификатор элемента
   * @returns Данные элемента или null
   */
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
      console.error("Ошибка при получении информации об элементе:", error);
      return null;
    }
  };

  /**
   * Получает данные сущности по localId
   * @param model - модель
   * @param localId - локальный идентификатор элемента
   * @returns Данные сущности или null
   */
  const getEntityData = async (
    model: FragmentsModel,
    localId: number
  ): Promise<any> => {
    return await getEntityByLocalId(localId, model);
  };

  /**
   * Очищает загруженные данные
   */
  const clear = () => {
    levelsData.value = [];
    isLoadingLevels.value = false;
  };

  return {
    // Реактивные состояния
    levelsData,
    isLoadingLevels,

    // Методы
    loadLevels,
    getElementInfo,
    getEntityData,
    clear,
  };
};
