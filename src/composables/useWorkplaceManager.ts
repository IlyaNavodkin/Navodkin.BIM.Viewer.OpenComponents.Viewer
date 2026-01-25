import {
  ref,
  computed,
  type Ref,
  type ComputedRef,
} from "vue";
import { useEmployeeStore } from "../stores/employeeStore";
import * as OBC from "@thatopen/components";
import { IDataAccessManager, LevelsViewData, WorkplaceCardData } from "./useDataAccess";
import { ILevelManager } from "./useLevels";
import { IIfcSelectManager } from "./useIfcSelectManager";
import { ItemAttribute } from "@thatopen/fragments";

export type WorkplaceCardData = {
  localId: number;
  workplaceNumber: string;
  level: LevelsViewData | null;
  employeeName: string | null;
  employeeAvatarUrl: string | null;
  isOccupied: boolean;
};

export interface IWorkplaceManager {
  workPlaceLevels: ComputedRef<LevelsViewData[]>;
  workPlaces: Ref<WorkplaceCardData[]>;
  isLoading: Ref<boolean>;
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
  ifcSelectManager: IIfcSelectManager): IWorkplaceManager => {
  const employeeStore = useEmployeeStore();

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
      await ifcSelectManager.clearSelection();
      return;
    }

    const model = await dataAccess.getFragmentModelByLocalId(localId)

    if (!model)
      throw new Error("Модели не существует чееелл")

    const modelIdMap: OBC.ModelIdMap = {
      [model.modelId]: new Set([localId]),
    };

    await ifcSelectManager.selectElementsByLocalIds(modelIdMap);
  };

  const clearWorkplaceSelection = async () => {
    await ifcSelectManager.clearSelection();
  };

  const loadWorkplaces = async (modelId: string) => {
    try {
      isLoading.value = true;
      clearWorkplaces();

      const levels = levelsManager.fileLevels.value;
      const cards = await getWorkplaceCards(modelId, levels);
      workPlaces.value = cards;

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
        console.log("Item:", item);
        const properties = await dataAccess.getPropertySet(
          (item._localId as ItemAttribute)?.value as number,
          modelId,
        );
        console.log("Properties:", properties);
        const workplaceNumber = properties[identityGroupName]?.Comments;
        const levelName = properties[constrantGroupName]?.Level;
        const levelsNameWithoutPrefix = levelName?.replace(levelPrefix, "");

        if (workplaceNumber) {
          const levelData = levelsNameWithoutPrefix
            ? (levels.find((l) => l.name === levelsNameWithoutPrefix) ?? null)
            : null;

          const employee =
            employeeStore.getEmployeeByWorkplaceNumber(workplaceNumber);

          workplaceCards.push({
            localId: (item._localId as ItemAttribute)?.value as number,
            workplaceNumber: workplaceNumber,
            level: levelData,
            employeeName: employee?.name ?? null,
            employeeAvatarUrl: employee?.avatarUrl ?? null,
            isOccupied: !!employee,
          });
        }
      }
    }

    return workplaceCards;
  };


  const clearWorkplaces = () => {
    workPlaces.value = [];
  };

  return {
    workPlaceLevels,
    workPlaces,
    isLoading,

    loadWorkplaces,
    clearWorkplaces,
    selectWorkplaceById,
    clearWorkplaceSelection,
    selectWorkplaceByEmployeeId
  };
};
