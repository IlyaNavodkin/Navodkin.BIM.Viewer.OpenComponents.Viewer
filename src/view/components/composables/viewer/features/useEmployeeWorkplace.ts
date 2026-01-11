import {
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  type Ref,
  type ComputedRef,
} from "vue";
import { useViewerManagerStore } from "@/stores/useViewerManagerStore";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import { useSelection } from "./useSelection";
import { useDataAccess, type LevelsViewData } from "../data/useDataAccess";
import { useWorkplaceMarkers } from "./useWorkplaceMarkers";
import * as OBC from "@thatopen/components";
import type { WorkplaceCardData } from "@/view/components/viewport/WorkplaceCard.vue";
import { useRoute } from "vue-router";

export interface IEmployeeWorkplace {
  workplaceCards: ComputedRef<WorkplaceCardData[]>;
  filteredWorkplaceCards: ComputedRef<WorkplaceCardData[]>;
  selectedLevel: Ref<string>;
  searchQuery: Ref<string>;
  occupancyFilter: Ref<string>;
  availableLevels: ComputedRef<LevelsViewData[]>;
  selectedLocalId: ComputedRef<number | null>;

  selectWorkplaceById: (localId: number) => Promise<void>;
  selectWorkplaceFromRoute: () => Promise<void>;
  loadEmployeeWorkplaces: (modelId: string) => Promise<void>;
  clearWorkplaces: () => void;
  initMarkers: () => void;
  updateMarkers: () => Promise<void>;
}

const globalEventName = "workplace-marker-select";

export const useEmployeeWorkplace = (viewerId: string): IEmployeeWorkplace => {
  const route = useRoute();
  const viewerManager = useViewerManagerStore();
  const viewerStore = viewerManager.getViewer(viewerId);
  const employeeStore = useEmployeeStore();
  const selection = useSelection(viewerId);
  const { getWorkplaceCards } = useDataAccess(viewerId);
  const markers = useWorkplaceMarkers(viewerId);

  const selectedLevel = ref<string>("all");
  const searchQuery = ref<string>("");
  const occupancyFilter = ref<string>("all");

  // Выбранная карточка
  const selectedLocalId = computed<number | null>(() => {
    return viewerStore.features.selection.highlightedElement?.localId ?? null;
  });

  // ✅ Получаем готовые карточки напрямую из store
  const workplaceCards = computed<WorkplaceCardData[]>(() => {
    return viewerStore.features.employeeWorkplace.workplaceCards.data;
  });

  // Список доступных уровней (отсортированных по высоте от нижнего к верхнему)
  const availableLevels = computed<LevelsViewData[]>(() => {
    const levelsMap = new Map<string, LevelsViewData>();

    workplaceCards.value.forEach((card) => {
      if (card.level && !levelsMap.has(card.level.name)) {
        levelsMap.set(card.level.name, card.level);
      }
    });

    return Array.from(levelsMap.values()).sort(
      (a, b) => a.elevation - b.elevation
    );
  });

  // Фильтрованные карточки (сортировка по elevation от нижнего к верхнему)
  const filteredWorkplaceCards = computed<WorkplaceCardData[]>(() => {
    let filtered = workplaceCards.value;

    // Фильтр по уровню
    if (selectedLevel.value !== "all") {
      filtered = filtered.filter(
        (card) => card.level?.name === selectedLevel.value
      );
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
          (card.level?.name && card.level.name.toLowerCase().includes(query)) ||
          (card.employeeName && card.employeeName.toLowerCase().includes(query))
      );
    }

    // Сортируем по высоте (от нижнего к верхнему)
    return filtered.sort((a, b) => {
      if (!a.level || !b.level) return 0;
      return a.level.elevation - b.level.elevation;
    });
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

  // Обработка клика на карточку
  const selectWorkplaceById = async (localId: number) => {
    if (!viewerStore.modelManager.model) return;

    // ✅ Проверяем, что элемент является рабочим местом
    const isWorkplace = workplaceCards.value.some(
      (card) => card.localId === localId
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
    // Обновляем видимость маркеров на основе фильтров (не пересоздаем!)
    updateMarkersVisibility();
  });

  // Подписка на события выбора из маркера
  onMounted(() => {
    window.addEventListener(globalEventName, handleMarkerSelect);
  });

  onUnmounted(() => {
    window.removeEventListener(globalEventName, handleMarkerSelect);
    markers.dispose();
  });

  // ✅ Загрузка карточек рабочих мест (с данными сотрудников)
  const loadEmployeeWorkplaces = async (modelId: string) => {
    try {
      viewerStore.features.employeeWorkplace.workplaceCards.setLoading(true);
      viewerStore.features.employeeWorkplace.workplaceCards.setData([]);

      // Получаем уровни из store для сопоставления
      const levels = viewerStore.features.level.data;
      const cards = await getWorkplaceCards(modelId, levels);
      viewerStore.features.employeeWorkplace.workplaceCards.setData(cards);

      console.log(`Loaded workplace cards: ${cards.length}`);
    } catch (error) {
      console.error("Error loading workplace cards:", error);
      viewerStore.features.employeeWorkplace.workplaceCards.setData([]);
    } finally {
      viewerStore.features.employeeWorkplace.workplaceCards.setLoading(false);
    }
  };

  // Очистка данных рабочих мест
  const clearWorkplaces = () => {
    markers.clearAllMarkers();
    viewerStore.features.employeeWorkplace.workplaceCards.clear();
  };

  // Инициализация маркеров
  const initMarkers = () => {
    markers.init();
  };

  // Создание маркеров на основе всех рабочих мест (вызывается один раз после загрузки)
  const updateMarkers = async () => {
    // Создаем маркеры для ВСЕХ рабочих мест

    console.log("🔵 [useEmployeeWorkplace] updateMarkers CALLED");
    console.log("workplaceCards.value", workplaceCards.value);
    await markers.createMarkersForWorkplaces(workplaceCards.value);
  };

  // Обновление видимости маркеров на основе фильтров (не пересоздает маркеры)
  const updateMarkersVisibility = () => {
    console.log("🟡 [useEmployeeWorkplace] updateMarkersVisibility CALLED");
    console.trace("Call stack:");

    // Получаем localId отфильтрованных рабочих мест
    const visibleLocalIds = new Set(
      filteredWorkplaceCards.value.map((card) => card.localId)
    );

    // Показываем/скрываем маркеры в зависимости от фильтров
    workplaceCards.value.forEach((card) => {
      const shouldBeVisible = visibleLocalIds.has(card.localId);
      markers.updateMarkerVisibility(card.localId, shouldBeVisible);
    });
  };

  // Обработчик события выбора из маркера
  const handleMarkerSelect = (event: Event) => {
    const customEvent = event as CustomEvent<{ localId: number }>;
    if (customEvent.detail?.localId) {
      selectWorkplaceById(customEvent.detail.localId);
    }
  };

  return {
    workplaceCards,
    filteredWorkplaceCards,
    selectedLevel,
    searchQuery,
    occupancyFilter,
    availableLevels,
    selectedLocalId,

    selectWorkplaceById,
    selectWorkplaceFromRoute,
    loadEmployeeWorkplaces,
    clearWorkplaces,
    initMarkers,
    updateMarkers,
  };
};
