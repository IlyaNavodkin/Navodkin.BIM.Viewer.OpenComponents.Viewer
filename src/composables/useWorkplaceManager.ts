import {
  ref,
  computed,
  type Ref,
  type ComputedRef,
} from "vue";
import { useEmployeeStore } from "../stores/employeeStore";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import { IDataAccessManager } from "./useDataAccess";
import { type LevelsViewData, ILevelManager } from "./useLevels";
import { IIfcSelectManager } from "./useIfcSelectManager";
import { ItemAttribute } from "@thatopen/fragments";
import { useWorkplaceMarkers } from "./useWorkplaceMarkers";

export type WorkplaceCardData = {
  localId: number;
  workplaceNumber: string;
  level?: LevelsViewData;
  employeeName?: string;
  employeeAvatarUrl?: string;
  isOccupied: boolean;
};

export type WorkplaceCardFilter = {
  level?: string;
  occupancy?: string;
  query?: string;
};

export type WorkplaceMarkerClickHandler = (localId: number) => void | Promise<void>;

export interface IWorkplaceMarkerState {
  selectedLocalId: ComputedRef<number | null>;
  visibility: Ref<Record<number, boolean>>;
  isSelected: (localId: number) => boolean;
  select: (localId: number) => void;
  clearSelection: () => void;
  setVisibility: (localId: number, visible: boolean) => void;
  isVisible: (localId: number) => boolean;
  clear: () => void;
  handleClick: (localId: number) => Promise<void>;
}

export const MARKER_STATE_KEY = Symbol("workplaceMarkerState");

export interface IWorkplaceManager {
  workPlaceLevels: ComputedRef<LevelsViewData[]>;
  workPlaces: Ref<WorkplaceCardData[]>;
  isLoading: Ref<boolean>;
  selectedLocalId: ComputedRef<number | null>;
  loadWorkplaces: (modelId: string) => Promise<void>;
  clearWorkplaces: () => void;
  selectWorkplaceById: (localId: number) => Promise<void>;
  clearWorkplaceSelection: () => Promise<void>;
  selectWorkplaceByEmployeeId: (employeeId: string) => Promise<void>;
}

const constrantGroupName = "Constraints";
const identityGroupName = "Identity Data";
const levelPrefix = "Level: ";
const workplaceIfcCategoryRegexPattern = /IFCFURNISHINGELEMENT/;

export const useWorkplaceManager = (
  dataAccess: IDataAccessManager,
  levelsManager: ILevelManager,
  ifcSelectManager: IIfcSelectManager,
  fragments: OBC.FragmentsManager,
  world: OBC.SimpleWorld<
    OBC.SimpleScene,
    OBC.SimpleCamera,
    OBF.PostproductionRenderer
  >,
): IWorkplaceManager => {
  const employeeStore = useEmployeeStore();

  const markerSelectedLocalId = ref<number | null>(null);
  const markerVisibility = ref<Record<number, boolean>>({});
  const markerClickHandler = ref<WorkplaceMarkerClickHandler | null>(null);

  const markerState: IWorkplaceMarkerState = {
    selectedLocalId: computed(() => markerSelectedLocalId.value),
    visibility: markerVisibility,
    isSelected: (localId: number) => markerSelectedLocalId.value === localId,
    select: (localId: number) => {
      markerSelectedLocalId.value = localId;
    },
    clearSelection: () => {
      markerSelectedLocalId.value = null;
    },
    setVisibility: (localId: number, visible: boolean) => {
      markerVisibility.value = { ...markerVisibility.value, [localId]: visible };
    },
    isVisible: (localId: number) => {
      return markerVisibility.value[localId] !== false;
    },
    clear: () => {
      markerSelectedLocalId.value = null;
      markerVisibility.value = {};
    },
    handleClick: async (localId: number) => {
      await markerClickHandler.value?.(localId);
    },
  };

  const workplaceMarkers = useWorkplaceMarkers(fragments, dataAccess, world, markerState);

  const isLoading = ref<boolean>(false);
  const workPlaces = ref<WorkplaceCardData[]>([]);

  const workPlaceLevels = computed<LevelsViewData[]>(() => {
    const levelsMap = new Map<string, LevelsViewData>();

    workPlaces.value.forEach((card) => {
      if (card.level && !levelsMap.has(card.level.name)) {
        levelsMap.set(card.level.name, card.level);
      }
    });

    return Array.from(levelsMap.values()).sort(
      (a, b) => a.elevation - b.elevation,
    );
  });

  const selectWorkplaceByEmployeeId = async (employeeId: string) => {
    const employee = employeeStore.getEmployeeById(employeeId);
    if (!employee) {
      console.warn(`Employee with id ${employeeId} not found`);
      return;
    }

    if (!employee.workplaceNumber) {
      console.warn(`Employee ${employeeId} has no workplace assigned`);
      return;
    }

    const workplace = workPlaces.value.find(
      (card) => card.workplaceNumber === employee.workplaceNumber
    );

    if (workplace) {
      await selectWorkplaceById(workplace.localId);
    } else {
      console.warn(`Workplace with number ${employee.workplaceNumber} not found in loaded workplaces`);
    }
  };

  const selectWorkplaceById = async (localId: number) => {
    const isWorkplace = workPlaces.value.some(
      (card) => card.localId === localId
    );

    if (!isWorkplace) {
      markerState.clearSelection();
      await ifcSelectManager.clearSelection();
      return;
    }

    markerState.select(localId);

    const model = await dataAccess.getFragmentModelByLocalId(localId)

    if (!model)
      throw new Error("Модели не существует чееелл")

    const modelIdMap: OBC.ModelIdMap = {
      [model.modelId]: new Set([localId]),
    };

    await ifcSelectManager.selectElementsByLocalIds(modelIdMap);
  };

  const clearWorkplaceSelection = async () => {
    markerState.clearSelection();
    await ifcSelectManager.clearSelection();
  };

  const loadWorkplaces = async (modelId: string) => {
    try {
      isLoading.value = true;
      clearWorkplaces();

      const levels = levelsManager.fileLevels.value;
      const cards = await getWorkplaceCards(modelId, levels);
      workPlaces.value = cards;
      await workplaceMarkers.createMarkersForWorkplaces(cards);

    } catch (error) {
      clearWorkplaces();
    } finally {
      isLoading.value = false;
    }
  };

  const getWorkplaceCards = async (
    modelId: string,
    levels: LevelsViewData[],
  ): Promise<WorkplaceCardData[]> => {
    const modelFromId = dataAccess.getModels().find((model) => model.modelId === modelId);
    if (!modelFromId) {
      throw new Error(`Model not found for modelId: ${modelId}`);
    }

    const workplaceCards: WorkplaceCardData[] = [];

    const workplaceItems = await modelFromId.getItemsOfCategories([
      workplaceIfcCategoryRegexPattern,
    ]);
    const workplaceIds = Object.values(workplaceItems).flat();

    console.log("Found employee workplaces (localId):", workplaceIds);

    if (workplaceIds.length > 0) {
      const workplaceData = await modelFromId.getItemsData(workplaceIds, {
        attributesDefault: true,
      });
      console.log("Employee workplace data:", workplaceData);

      for (const item of workplaceData) {

        const properties = await dataAccess.getPropertySet(
          (item._localId as ItemAttribute)?.value as number,
          modelId,
        );

        const workplaceNumber = properties[identityGroupName]?.Comments;
        const levelName = properties[constrantGroupName]?.Level;
        const levelsNameWithoutPrefix = levelName?.replace(levelPrefix, "");

        if (workplaceNumber) {
          const levelData = levelsNameWithoutPrefix
            ? (levels.find((l) => l.name === levelsNameWithoutPrefix) ?? undefined)
            : null;

          const employee =
            employeeStore.getEmployeeByWorkplaceNumber(workplaceNumber);

          workplaceCards.push({
            localId: (item._localId as ItemAttribute)?.value as number,
            workplaceNumber: workplaceNumber,
            level: levelData ?? undefined,
            employeeName: employee?.name ?? undefined,
            employeeAvatarUrl: employee?.avatarUrl ?? undefined,
            isOccupied: !!employee,
          });
        }
      }
    }

    return workplaceCards;
  };


  const clearWorkplaces = () => {
    workPlaces.value = [];
    workplaceMarkers.clearAllMarkers();
    markerState.clear();
  };

  markerClickHandler.value = async (localId: number) => {
    const currentlySelected = markerState.selectedLocalId.value;
    if (currentlySelected === localId) {
      await clearWorkplaceSelection();
      return;
    }

    await selectWorkplaceById(localId);
  };

  return {
    workPlaceLevels,
    workPlaces,
    isLoading,
    selectedLocalId: markerState.selectedLocalId,

    loadWorkplaces,
    clearWorkplaces,
    selectWorkplaceById,
    clearWorkplaceSelection,
    selectWorkplaceByEmployeeId
  };
};


