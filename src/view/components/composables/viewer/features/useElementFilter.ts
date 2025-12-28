import { watch } from "vue";
import * as FRAGS from "@thatopen/fragments";
import { FragmentsModel } from "@thatopen/fragments";
import { useDataAccess } from "../data/useDataAccess";
import * as OBC from "@thatopen/components";
import {
  ALL_PLACEMENTS_HIGHLIGHTER_NAME,
  SELECT_PLACEMENT_HIGHLIGHTER_NAME,
} from "./useSelection";
import { useViewerCoreStore } from "@/stores/useViewerCoreStore";
import { useEmployeeStore } from "@/stores/employee";

/**
 * Тип данных элемента
 */
export interface ElementData {
  Name: string | null;
  LocalId: number;
  Tag: string | null;
  ObjectType: string | null;
  Category: string | null;
  Comments: string | null;
  Level: string | null;
}

/**
 * Фича для фильтрации элементов модели
 * Отвечает за фильтрацию элементов по различным критериям
 * @param model - реактивная ссылка на текущую модель (управляется через useModelManager)
 */
export const useElementFilter = () => {
  const store = useViewerCoreStore();
  const { formatItemPsets } = useDataAccess();
  const employeeStore = useEmployeeStore();

  watch(
    () => store.features.elementFilter.selectedTableId.value,
    () => {
      if (
        !store.modelManager.model.value ||
        !store.features.selection.highlighter.value
      ) {
        return;
      }
      const modelIdMap: OBC.ModelIdMap = {
        [store.modelManager.model.value.modelId]: new Set(
          store.features.elementFilter.filteredElements.value.map(
            (item: ElementData) => item.LocalId
          )
        ),
      };
      store.features.selection.highlighter.value.highlightByID(
        ALL_PLACEMENTS_HIGHLIGHTER_NAME,
        modelIdMap,
        true
      );
    },
    { immediate: true }
  );

  const selectTable = async (localId: number) => {
    if (
      !store.modelManager.model.value ||
      !store.features.selection.highlighter.value
    ) {
      console.warn("Модель, камера или components не инициализированы");
      return;
    }

    // Очищаем предыдущий выбор, если есть
    await clearSelection();

    // Устанавливаем новый выбранный стол
    store.features.elementFilter.selectedTableId.value = localId;

    const modelIdMap: OBC.ModelIdMap = {
      [store.modelManager.model.value.modelId]: new Set([localId]),
    };

    store.features.selection.highlighter.value.highlightByID(
      SELECT_PLACEMENT_HIGHLIGHTER_NAME,
      modelIdMap,
      true,
      true
    );

    // Выделяем элемент (красным через mainSelectOutliner)
    // // mainSelectOutliner автоматически добавится через обработчик события onHighlight
    // selection.highlightActivePlacement(modelIdMap);

    // // Приближаем камеру к элементу
    // currentWord.value.camera.fitToItems(modelIdMap);
  };

  /**
   * Очищает выбор стола: удаляет маркер и highlight
   */
  const clearSelection = async () => {
    store.features.elementFilter.selectedTableId.value = null;
  };

  const showPreview = (localId: number) => {
    if (
      !store.modelManager.model.value ||
      !store.features.selection.highlighter.value
    ) {
      console.warn("Модель, камера или components не инициализированы");
      return;
    }
    store.features.selection.mainOutliner.value?.addItems({
      [store.modelManager.model.value.modelId]: new Set([localId]),
    });
  };

  const clearPreview = () => {
    if (
      !store.modelManager.model.value ||
      !store.features.selection.highlighter.value
    ) {
      console.warn("Модель, камера или components не инициализированы");
      return;
    }
    store.features.selection.mainOutliner.value?.clean();
  };
  /**
   * Загружает элементы IFCFURNISHINGELEMENT с фильтром по наличию непустого свойства Comments
   * Использует текущую модель из переданной зависимости
   */
  const loadFilteredElements = async () => {
    const currentModel = store.modelManager.model.value;
    console.log(
      `[useElementFilter.loadFilteredElements] Начало. isLoading: ${
        store.modelManager.isLoading.value
      }, модель: ${currentModel ? "есть" : "нет"}`
    );
    if (!currentModel) {
      console.warn("Модель не загружена, невозможно загрузить элементы");
      // ВАЖНО: убеждаемся, что isLoading не остается true
      console.log(
        `[useElementFilter.loadFilteredElements] Сбрасываем isLoading (нет модели): ${store.modelManager.isLoading.value} -> false`
      );
      store.setIsLoading(false);
      return;
    }

    try {
      console.log(
        `[useElementFilter.loadFilteredElements] Устанавливаем isLoading: ${store.modelManager.isLoading.value} -> true`
      );
      store.setIsLoading(true);
      store.setLoadingProgress(0);
      store.features.elementFilter.filteredElements.value = [];

      // Получаем элементы категории IFCFURNISHINGELEMENT
      const furnishingItems = await currentModel?.getItemsOfCategories?.([
        /IFCFURNISHINGELEMENT/,
      ]);
      const furnishingIds = Object.values(furnishingItems ?? {}).flat();

      if (furnishingIds.length === 0) {
        store.features.elementFilter.filteredElements.value = [];
        console.log(
          `[useElementFilter.loadFilteredElements] Сбрасываем isLoading (пустой список): ${store.modelManager.isLoading.value} -> false`
        );
        store.setIsLoading(false);
        return;
      }

      // Получаем данные элементов с property sets
      const itemsData = await currentModel?.getItemsData?.(furnishingIds, {
        attributesDefault: true,
        relations: {
          IsDefinedBy: { attributes: true, relations: true },
          DefinesOcurrence: { attributes: false, relations: false },
        },
      });

      const filtered: ElementData[] = [];

      for (let i = 0; i < (itemsData?.length ?? 0); i++) {
        const itemData = itemsData?.[i];
        const localId = furnishingIds[i];

        // Проверяем наличие свойства Comments с непустым значением
        if (itemData?.IsDefinedBy && Array.isArray(itemData?.IsDefinedBy)) {
          const psets = itemData.IsDefinedBy as FRAGS.ItemData[];
          // Используем готовую функцию для форматирования Property Sets
          const formattedPsets = formatItemPsets(psets);

          let hasNonEmptyComments = false;
          let commentsValue: string | null = null;
          let levelValue: string | null = null;

          // Ищем свойства Comments и Level во всех Property Sets
          for (const psetProps of Object.values(formattedPsets)) {
            // Ищем свойство Comments
            if ("Comments" in psetProps) {
              const value = psetProps.Comments;
              // Проверяем, что значение не пустое (не null, не undefined, не пустая строка)
              if (
                value !== null &&
                value !== undefined &&
                String(value).trim() !== ""
              ) {
                commentsValue = String(value).trim();
                hasNonEmptyComments = true;
              }
            }

            // Ищем свойство Level
            if ("Level" in psetProps) {
              const value = psetProps.Level;
              // Проверяем, что значение не пустое (не null, не undefined, не пустая строка)
              if (
                value !== null &&
                value !== undefined &&
                String(value).trim() !== ""
              ) {
                levelValue = String(value).trim();
              }
            }
          }

          // Добавляем элемент только если есть непустое свойство Comments
          if (hasNonEmptyComments) {
            // Извлекаем данные элемента
            const nameAttr = itemData.Name as FRAGS.ItemAttribute;
            const tagAttr = itemData.Tag as FRAGS.ItemAttribute;
            const objectTypeAttr = itemData.ObjectType as FRAGS.ItemAttribute;
            const categoryAttr = itemData._category as FRAGS.ItemAttribute;

            filtered.push({
              Name:
                nameAttr && "value" in nameAttr
                  ? (nameAttr.value as string | null)
                  : null,
              LocalId: localId,
              Tag:
                tagAttr && "value" in tagAttr
                  ? (tagAttr.value as string | null)
                  : null,
              ObjectType:
                objectTypeAttr && "value" in objectTypeAttr
                  ? (objectTypeAttr.value as string | null)
                  : null,
              Category:
                categoryAttr && "value" in categoryAttr
                  ? (categoryAttr.value as string | null)
                  : null,
              Comments: commentsValue,
              Level: levelValue,
            });
          }
        }
      }

      const modelIdMap: OBC.ModelIdMap = {
        [currentModel?.modelId ?? 0]: new Set(
          filtered.map((item) => item.LocalId)
        ),
      };

      if (store.features.selection.highlighter.value) {
        store.features.selection.highlighter.value.highlightByID(
          ALL_PLACEMENTS_HIGHLIGHTER_NAME,
          modelIdMap,
          true
        );
      }

      store.features.elementFilter.filteredElements.value = filtered;
      console.log(`Загружено элементов: ${filtered.length}`);
    } catch (error) {
      console.error("Ошибка при загрузке элементов:", error);
      store.features.elementFilter.filteredElements.value = [];
    } finally {
      // ВАЖНО: всегда сбрасываем isLoading, даже при ошибке
      console.log(
        `[useElementFilter.loadFilteredElements] Сбрасываем isLoading в finally: ${store.modelManager.isLoading.value} -> false`
      );
      store.setIsLoading(false);
    }
  };

  /**
   * Фильтрует элементы по категории
   * @param model - модель
   * @param categoryPattern - паттерн категории (регулярное выражение)
   * @returns Массив отфильтрованных элементов
   */
  const filterByCategory = async (
    model: FragmentsModel,
    categoryPattern: RegExp
  ): Promise<ElementData[]> => {
    try {
      const items = await model.getItemsOfCategories([categoryPattern]);
      const ids = Object.values(items).flat();

      if (ids.length === 0) {
        return [];
      }

      const itemsData = await model.getItemsData(ids, {
        attributesDefault: true,
      });

      const filtered: ElementData[] = [];

      for (let i = 0; i < itemsData.length; i++) {
        const itemData = itemsData[i];
        const localId = ids[i];

        const nameAttr = itemData.Name as FRAGS.ItemAttribute;
        const tagAttr = itemData.Tag as FRAGS.ItemAttribute;
        const objectTypeAttr = itemData.ObjectType as FRAGS.ItemAttribute;
        const categoryAttr = itemData._category as FRAGS.ItemAttribute;

        filtered.push({
          Name:
            nameAttr && "value" in nameAttr
              ? (nameAttr.value as string | null)
              : null,
          LocalId: localId,
          Tag:
            tagAttr && "value" in tagAttr
              ? (tagAttr.value as string | null)
              : null,
          ObjectType:
            objectTypeAttr && "value" in objectTypeAttr
              ? (objectTypeAttr.value as string | null)
              : null,
          Category:
            categoryAttr && "value" in categoryAttr
              ? (categoryAttr.value as string | null)
              : null,
          Comments: null,
          Level: null,
        });
      }

      return filtered;
    } catch (error) {
      console.error("Ошибка при фильтрации по категории:", error);
      return [];
    }
  };

  /**
   * Очищает отфильтрованные элементы
   */
  const clear = () => {
    store.features.elementFilter.filteredElements.value = [];
    store.setIsLoading(false);
  };

  /**
   * Получает номер места из Comments элемента
   * @param element - элемент данных
   * @returns Номер места или null
   */
  const getPlacementNumber = (element: ElementData): string | null => {
    return element.Comments || null;
  };

  /**
   * Проверяет, занято ли место сотрудником
   * @param element - элемент данных
   * @returns true, если место занято, иначе false
   */
  const isPlacementOccupied = (element: ElementData): boolean => {
    const placementNumber = getPlacementNumber(element);
    if (!placementNumber) return false;
    const employee = employeeStore.getEmployeeByPlacementId(placementNumber);
    return employee !== undefined;
  };

  /**
   * Получает информацию о сотруднике, занявшем место
   * @param element - элемент данных
   * @returns Данные сотрудника или null, если место свободно
   */
  const getEmployeeByPlacement = (element: ElementData) => {
    const placementNumber = getPlacementNumber(element);
    if (!placementNumber) return null;
    return employeeStore.getEmployeeByPlacementId(placementNumber);
  };

  return {
    loadFilteredElements,
    filterByCategory,
    clear,

    selectTable,
    clearSelection,

    showPreview,
    clearPreview,

    // Методы работы с сотрудниками и местами
    getPlacementNumber,
    isPlacementOccupied,
    getEmployeeByPlacement,
  };
};
