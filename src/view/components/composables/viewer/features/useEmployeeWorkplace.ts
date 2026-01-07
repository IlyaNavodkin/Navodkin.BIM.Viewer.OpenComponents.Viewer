import { ref, computed, watch, type Ref, type ComputedRef } from "vue";
import { useIFCViewerStore } from "@/stores/useViewerCoreStore";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import { useSelection } from "./useSelection";
import * as OBC from "@thatopen/components";
import type { WorkplaceCardData } from "@/view/components/viewport/WorkplaceCard.vue";

export interface IEmployeeWorkplace {
  workplaceCards: ComputedRef<WorkplaceCardData[]>;
  filteredWorkplaceCards: ComputedRef<WorkplaceCardData[]>;
  selectedLevel: Ref<string>;
  searchQuery: Ref<string>;
  occupancyFilter: Ref<string>;
  availableLevels: ComputedRef<string[]>;
  selectedLocalId: ComputedRef<number | null>;

  handleCardHover: (localId: number | null) => void;
  handleCardClick: (localId: number) => void;
  handleCardLeave: () => void;
}

export const useEmployeeWorkplace = (): IEmployeeWorkplace => {
  const viewerStore = useIFCViewerStore();
  const employeeStore = useEmployeeStore();
  const selection = useSelection();

  const selectedLevel = ref<string>("all");
  const searchQuery = ref<string>("");
  const occupancyFilter = ref<string>("all");

  // Выбранная карточка
  const selectedLocalId = computed<number | null>(() => {
    return (
      viewerStore.features.selection.currentSelectedElement?.localId ?? null
    );
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

  // Обработка наведения на карточку
  const handleCardHover = (localId: number | null) => {
    if (!viewerStore.modelManager.model) return;

    if (localId === null) {
      selection.hover.clear();
      return;
    }

    // Проверяем, что элемент является рабочим местом
    const isWorkplace =
      viewerStore.features.elementsData.employeeWorkplaces.data.some(
        (workplace) => workplace.localId === localId
      );

    if (!isWorkplace) {
      selection.hover.clear();
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

    selection.hover.set(modelIdMap);
  };

  // Обработка клика на карточку
  const handleCardClick = (localId: number) => {
    if (!viewerStore.modelManager.model) return;

    // Проверяем, что элемент является рабочим местом
    const isWorkplace =
      viewerStore.features.elementsData.employeeWorkplaces.data.some(
        (workplace) => workplace.localId === localId
      );

    if (!isWorkplace) {
      selection.highlight.clear();
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
    selection.highlight.set(modelIdMap);
  };

  // Обработка ухода курсора с карточки
  const handleCardLeave = () => {
    selection.hover.clear();
  };

  // Сброс выделения при изменении любого фильтра
  watch([selectedLevel, occupancyFilter, searchQuery], () => {
    selection.highlight.clear();
  });

  return {
    workplaceCards,
    filteredWorkplaceCards,
    selectedLevel,
    searchQuery,
    occupancyFilter,
    availableLevels,
    selectedLocalId,

    handleCardHover,
    handleCardClick,
    handleCardLeave,
  };
};
