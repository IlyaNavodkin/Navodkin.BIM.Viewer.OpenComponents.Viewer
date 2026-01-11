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

  const selectedLocalId = computed<number | null>(() => {
    return viewerStore.features.selection.highlightedElement?.localId ?? null;
  });

  const workplaceCards = computed<WorkplaceCardData[]>(() => {
    return viewerStore.features.employeeWorkplace.workplaceCards.data;
  });

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

  const filteredWorkplaceCards = computed<WorkplaceCardData[]>(() => {
    let filtered = workplaceCards.value;

    if (selectedLevel.value !== "all") {
      filtered = filtered.filter(
        (card) => card.level?.name === selectedLevel.value
      );
    }

    if (occupancyFilter.value !== "all") {
      if (occupancyFilter.value === "occupied") {
        filtered = filtered.filter((card) => card.isOccupied);
      } else if (occupancyFilter.value === "vacant") {
        filtered = filtered.filter((card) => !card.isOccupied);
      }
    }

    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase().trim();
      filtered = filtered.filter(
        (card) =>
          card.workplaceNumber.toLowerCase().includes(query) ||
          (card.level?.name && card.level.name.toLowerCase().includes(query)) ||
          (card.employeeName && card.employeeName.toLowerCase().includes(query))
      );
    }

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

  const selectWorkplaceById = async (localId: number) => {
    if (!viewerStore.modelManager.model) return;

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

    await selection.highlight.set(modelIdMap);
  };

  const scrollToSelectedCard = (localId: number) => {
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

  watch(
    () => viewerStore.features.selection.highlightedElement,
    (newSelectedElement) => {
      if (!newSelectedElement) return;

      const { localId } = newSelectedElement;

      const isWorkplace = workplaceCards.value.some(
        (card) => card.localId === localId
      );

      if (isWorkplace) {
        const isVisible = filteredWorkplaceCards.value.some(
          (card) => card.localId === localId
        );

        if (isVisible) {
          scrollToSelectedCard(localId);
        }
      }
    }
  );

  watch([selectedLevel, occupancyFilter, searchQuery], async () => {
    await selection.highlight.clear();
    updateMarkersVisibility();
  });

  onMounted(() => {
    window.addEventListener(globalEventName, handleMarkerSelect);
  });

  onUnmounted(() => {
    window.removeEventListener(globalEventName, handleMarkerSelect);
    markers.dispose();
  });

  const loadEmployeeWorkplaces = async (modelId: string) => {
    try {
      viewerStore.features.employeeWorkplace.workplaceCards.setLoading(true);
      viewerStore.features.employeeWorkplace.workplaceCards.setData([]);

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

  const clearWorkplaces = () => {
    markers.clearAllMarkers();
    viewerStore.features.employeeWorkplace.workplaceCards.clear();
  };

  const initMarkers = () => {
    markers.init();
  };

  const updateMarkers = async () => {
    console.log("🔵 [useEmployeeWorkplace] updateMarkers CALLED");
    console.log("workplaceCards.value", workplaceCards.value);
    await markers.createMarkersForWorkplaces(workplaceCards.value);
  };

  const updateMarkersVisibility = () => {
    console.log("🟡 [useEmployeeWorkplace] updateMarkersVisibility CALLED");
    console.trace("Call stack:");

    const visibleLocalIds = new Set(
      filteredWorkplaceCards.value.map((card) => card.localId)
    );

    workplaceCards.value.forEach((card) => {
      const shouldBeVisible = visibleLocalIds.has(card.localId);
      markers.updateMarkerVisibility(card.localId, shouldBeVisible);
    });
  };

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
