import { ref, watch, type Ref } from "vue";
import { FragmentsModel } from "@thatopen/fragments";
import * as FRAGS from "@thatopen/fragments";
import { useDataAccess } from "../data/useDataAccess";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import {
  ALL_PLACEMENTS_HIGHLIGHTER_NAME,
  SELECT_HIGHLIGHTER_NAME,
  SELECT_PLACEMENT_HIGHLIGHTER_NAME,
} from "./useSelection";

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
export const useElementFilter = (
  model: Ref<FragmentsModel | undefined>,
  highlighter: OBF.Highlighter | undefined,
  mainSelector: {
    draw: (modelIdMap: OBC.ModelIdMap) => void;
    clear: () => void;
  }
) => {
  const { formatItemPsets } = useDataAccess();
  const filteredElements = ref<ElementData[]>([]);
  const selectedTableId = ref<number | null>(null);

  const isLoadingElements = ref(false);

  watch(
    selectedTableId,
    () => {
      if (!model?.value || !highlighter) {
        return;
      }
      const modelIdMap: OBC.ModelIdMap = {
        [model.value.modelId]: new Set(
          filteredElements.value.map((item) => item.LocalId)
        ),
      };
      highlighter.highlightByID(
        ALL_PLACEMENTS_HIGHLIGHTER_NAME,
        modelIdMap,
        true
      );
    },
    { immediate: true }
  );

  if (highlighter) {
    highlighter.events[SELECT_PLACEMENT_HIGHLIGHTER_NAME].onHighlight.add(
      (map) => {
        console.log("selectPlacement highlighted:", map);
        mainSelector.clear();
        mainSelector.draw(map);
      }
    );

    highlighter.events[ALL_PLACEMENTS_HIGHLIGHTER_NAME].onHighlight.add(
      (map) => {
        console.log("allPlacements highlighted:", map);
      }
    );
  }

  const selectTable = async (localId: number) => {
    if (!model.value || !highlighter) {
      console.warn("Модель, камера или components не инициализированы");
      return;
    }

    // Очищаем предыдущий выбор, если есть
    await clearSelection();

    // Устанавливаем новый выбранный стол
    selectedTableId.value = localId;

    const modelIdMap: OBC.ModelIdMap = {
      [model.value.modelId]: new Set([localId]),
    };

    highlighter.highlightByID(
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
    selectedTableId.value = null;
  };

  const showPreview = (localId: number) => {
    if (!model.value || !highlighter) {
      console.warn("Модель, камера или components не инициализированы");
      return;
    }
    mainSelector.draw({
      [model.value.modelId]: new Set([localId]),
    });
  };

  const clearPreview = () => {
    if (!model.value || !highlighter) {
      console.warn("Модель, камера или components не инициализированы");
      return;
    }
    mainSelector.clear();
  };
  /**
   * Загружает элементы IFCFURNISHINGELEMENT с фильтром по наличию непустого свойства Comments
   * Использует текущую модель из переданной зависимости
   */
  const loadFilteredElements = async () => {
    const currentModel = model.value;
    if (!currentModel) {
      console.warn(
        "Модель не загружена. Невозможно загрузить отфильтрованные элементы."
      );
      return;
    }

    try {
      isLoadingElements.value = true;
      filteredElements.value = [];

      // Получаем элементы категории IFCFURNISHINGELEMENT
      const furnishingItems = await currentModel.getItemsOfCategories([
        /IFCFURNISHINGELEMENT/,
      ]);
      const furnishingIds = Object.values(furnishingItems).flat();

      if (furnishingIds.length === 0) {
        filteredElements.value = [];
        isLoadingElements.value = false;
        return;
      }

      // Получаем данные элементов с property sets
      const itemsData = await currentModel.getItemsData(furnishingIds, {
        attributesDefault: true,
        relations: {
          IsDefinedBy: { attributes: true, relations: true },
          DefinesOcurrence: { attributes: false, relations: false },
        },
      });

      const filtered: ElementData[] = [];

      for (let i = 0; i < itemsData.length; i++) {
        const itemData = itemsData[i];
        const localId = furnishingIds[i];

        // Проверяем наличие свойства Comments с непустым значением
        if (itemData.IsDefinedBy && Array.isArray(itemData.IsDefinedBy)) {
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
        [currentModel.modelId]: new Set(filtered.map((item) => item.LocalId)),
      };

      if (highlighter) {
        highlighter.highlightByID(
          ALL_PLACEMENTS_HIGHLIGHTER_NAME,
          modelIdMap,
          true
        );
      }

      filteredElements.value = filtered;
      console.log(`Загружено элементов: ${filtered.length}`);
    } catch (error) {
      console.error("Ошибка при загрузке элементов:", error);
      filteredElements.value = [];
    } finally {
      isLoadingElements.value = false;
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
    filteredElements.value = [];
    isLoadingElements.value = false;
  };

  return {
    // Реактивные состояния
    filteredElements,
    isLoadingElements,
    selectedTableId,

    // Методы
    loadFilteredElements,
    filterByCategory,
    clear,

    selectTable,
    clearSelection,

    showPreview,
    clearPreview,
  };
};
