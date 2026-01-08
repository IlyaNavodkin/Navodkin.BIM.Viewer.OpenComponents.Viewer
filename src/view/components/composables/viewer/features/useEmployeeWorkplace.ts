import { ref, computed, watch, type Ref, type ComputedRef } from "vue";
import { useIFCViewerStore } from "@/stores/useViewerCoreStore";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import { useSelection } from "./useSelection";
import { useDataAccess } from "../data/useDataAccess";
import * as OBC from "@thatopen/components";
import type { WorkplaceCardData } from "@/view/components/viewport/WorkplaceCard.vue";
import { useRoute } from "vue-router";

export interface IEmployeeWorkplace {
  workplaceCards: ComputedRef<WorkplaceCardData[]>;
  filteredWorkplaceCards: ComputedRef<WorkplaceCardData[]>;
  selectedLevel: Ref<string>;
  searchQuery: Ref<string>;
  occupancyFilter: Ref<string>;
  availableLevels: ComputedRef<string[]>;
  selectedLocalId: ComputedRef<number | null>;

  hoverWorkplace: (localId: number | null) => Promise<void>;
  selectWorkplaceById: (localId: number) => Promise<void>;
  releaseHoverWorkplace: () => Promise<void>;
  selectWorkplaceFromRoute: () => Promise<void>;
  loadEmployeeWorkplaces: (modelId: string) => Promise<void>;
  clearWorkplaces: () => void;
}

export const useEmployeeWorkplace = (): IEmployeeWorkplace => {
  const route = useRoute();
  const viewerStore = useIFCViewerStore();
  const employeeStore = useEmployeeStore();
  const selection = useSelection();
  const { getEmployeeWorkplaces } = useDataAccess();

  const selectedLevel = ref<string>("all");
  const searchQuery = ref<string>("");
  const occupancyFilter = ref<string>("all");

  // Выбранная карточка
  const selectedLocalId = computed<number | null>(() => {
    return viewerStore.features.selection.highlightedElement?.localId ?? null;
  });

  // Агрегированные данные: объединяем рабочие места и сотрудников
  const workplaceCards = computed<WorkplaceCardData[]>(() => {
    const workplaces =
      viewerStore.features.elementsData.employeeWorkplaces.data;

    return workplaces.map((workplace) => {
      const employee = employeeStore.getEmployeeByWorkplaceNumber(
        workplace.workplaceNumber
      );

      return {
        localId: workplace.localId,
        workplaceNumber: workplace.workplaceNumber,
        level: workplace.level,
        employeeName: employee?.name ?? null,
        employeeAvatarUrl: employee?.avatarUrl ?? null,
        isOccupied: !!employee,
      };
    });
  });

  // Список доступных уровней
  const availableLevels = computed<string[]>(() => {
    const levels = new Set<string>();
    workplaceCards.value.forEach((card) => {
      levels.add(card.level);
    });
    return Array.from(levels).sort();
  });

  // Фильтрованные карточки
  const filteredWorkplaceCards = computed<WorkplaceCardData[]>(() => {
    let filtered = workplaceCards.value;

    // Фильтр по уровню
    if (selectedLevel.value !== "all") {
      filtered = filtered.filter((card) => card.level === selectedLevel.value);
    }

    // Фильтр по занятости
    if (occupancyFilter.value !== "all") {
      if (occupancyFilter.value === "occupied") {
        filtered = filtered.filter((card) => card.isOccupied);
      } else if (occupancyFilter.value === "vacant") {
        filtered = filtered.filter((card) => !card.isOccupied);
      }
    }

    // Поиск по номеру места, уровню и имени сотрудника
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase().trim();
      filtered = filtered.filter(
        (card) =>
          card.workplaceNumber.toLowerCase().includes(query) ||
          card.level.toLowerCase().includes(query) ||
          (card.employeeName && card.employeeName.toLowerCase().includes(query))
      );
    }

    return filtered;
  });

  const selectWorkplaceFromRoute = async () => {
    const employeeId = route.params.employeeId;
    if (typeof employeeId === "string") {
      const employee = employeeStore.getEmployeeById(employeeId);
      if (!employee) return;
      const workplace = workplaceCards.value.find(
        (card) => card.workplaceNumber === employee?.workplaceNumber
      );
      if (workplace) {
        await selectWorkplaceById(workplace.localId);
      }
    }
  };

  // Обработка наведения на карточку
  const hoverWorkplace = async (localId: number | null) => {
    if (!viewerStore.modelManager.model) return;

    if (localId === null) {
      await selection.hover.clear();
      return;
    }

    // Проверяем, что элемент является рабочим местом
    const isWorkplace =
      viewerStore.features.elementsData.employeeWorkplaces.data.some(
        (workplace) => workplace.localId === localId
      );

    if (!isWorkplace) {
      await selection.hover.clear();
      return;
    }

    const modelId = viewerStore.modelManager.model.modelId;
    const modelIdMap: OBC.ModelIdMap = {
      [modelId]: new Set([localId]),
    };

    console.log("=== Card Hover ===");
    console.log("LocalId:", localId);
    console.log("ModelId:", modelId);
    console.log("ModelIdMap:", modelIdMap);
    console.log("==================");

    await selection.hover.set(modelIdMap);
  };

  // Обработка клика на карточку
  const selectWorkplaceById = async (localId: number) => {
    if (!viewerStore.modelManager.model) return;

    // Проверяем, что элемент является рабочим местом
    const isWorkplace =
      viewerStore.features.elementsData.employeeWorkplaces.data.some(
        (workplace) => workplace.localId === localId
      );

    if (!isWorkplace) {
      await selection.highlight.clear();
      return;
    }

    const modelId = viewerStore.modelManager.model.modelId;
    const modelIdMap: OBC.ModelIdMap = {
      [modelId]: new Set([localId]),
    };

    console.log("=== Card Click ===");
    console.log("LocalId:", localId);
    console.log("ModelId:", modelId);
    console.log("ModelIdMap:", modelIdMap);
    console.log("==================");

    // Устанавливаем выделение (без возможности сброса при повторном клике)
    await selection.highlight.set(modelIdMap);
  };

  // Обработка ухода курсора с карточки
  const releaseHoverWorkplace = async () => {
    await selection.hover.clear();
  };

  // Прокрутка к выбранной карточке
  const scrollToSelectedCard = (localId: number) => {
    // Ждем следующего тика для рендера
    setTimeout(() => {
      const cardElement = document.querySelector(
        `[data-workplace-card-id="${localId}"]`
      ) as HTMLElement | null;

      if (cardElement) {
        cardElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        });
      }
    }, 100);
  };

  // Отслеживание изменений выделения и прокрутка к карточке
  watch(
    () => viewerStore.features.selection.highlightedElement,
    (newSelectedElement) => {
      if (!newSelectedElement) return;

      const { localId } = newSelectedElement;

      // Проверяем, что элемент является рабочим местом
      const isWorkplace = workplaceCards.value.some(
        (card) => card.localId === localId
      );

      if (isWorkplace) {
        // Проверяем, что карточка присутствует в отфильтрованном списке
        const isVisible = filteredWorkplaceCards.value.some(
          (card) => card.localId === localId
        );

        if (isVisible) {
          scrollToSelectedCard(localId);
        }
      }
    }
  );

  // Сброс выделения при изменении любого фильтра
  watch([selectedLevel, occupancyFilter, searchQuery], async () => {
    await selection.highlight.clear();
  });

  // Загрузка рабочих мест из модели
  const loadEmployeeWorkplaces = async (modelId: string) => {
    try {
      viewerStore.setEmployeeWorkplacesLoading(true);
      viewerStore.setEmployeeWorkplaces([]);

      const workplaces = await getEmployeeWorkplaces(modelId);
      viewerStore.setEmployeeWorkplaces(workplaces);

      console.log(
        `Loaded employee workplaces: ${viewerStore.features.elementsData.employeeWorkplaces.data.length}`
      );
    } catch (error) {
      console.error("Error loading employee workplaces:", error);
      viewerStore.setEmployeeWorkplaces([]);
    } finally {
      viewerStore.setEmployeeWorkplacesLoading(false);
    }
  };

  // Очистка данных рабочих мест
  const clearWorkplaces = () => {
    viewerStore.clearEmployeeWorkplaces();
  };

  return {
    workplaceCards,
    filteredWorkplaceCards,
    selectedLevel,
    searchQuery,
    occupancyFilter,
    availableLevels,
    selectedLocalId,

    hoverWorkplace,
    releaseHoverWorkplace,
    selectWorkplaceById,

    selectWorkplaceFromRoute,
    loadEmployeeWorkplaces,
    clearWorkplaces,
  };
};
