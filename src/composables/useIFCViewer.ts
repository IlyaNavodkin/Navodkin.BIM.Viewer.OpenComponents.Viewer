import { viewerService } from "../services/viewerService";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import { computed, ComputedRef, reactive, Ref, ref, shallowRef } from "vue";
import { FragmentsModel } from "@thatopen/fragments";
import * as THREE from "three";
import { IDataAccessManager, useDataAccessManager } from "./useDataAccess";
import { ILevelManager, type LevelsViewData, useLevels } from "./useLevels";
import { IIfcSelectManager, useIfcSelectManager } from "./useIfcSelectManager";
import {
  type IWorkplaceManager,
  type WorkplaceCardData,
  useWorkplaceManager,
} from "./useWorkplaceManager";
import { useAirplaneManager, type IAirplaneManager } from "./useAirplaneManager";

export type ModelLoadingState = {
  isLoading: boolean;
  progress: number;
  modelName: string | null;
};

export type IFCViewerConfig = {
  modelPath: string;
  modelName: string;
  selectionColor: string;
};

export interface IIFCViewer {
  modelLoading: ModelLoadingState;

  disposeViewer: () => void;
  setupViewer: (containerRef: HTMLElement, employeeId?: string) => Promise<void>;

  employeeWorkplace: {
    isLoading: ComputedRef<boolean>;
    filteredWorkplaceCards: ComputedRef<WorkplaceCardData[]>;
    availableLevels: ComputedRef<LevelsViewData[]>;
    selectedLevel: Ref<string>;
    searchQuery: Ref<string>;
    occupancyFilter: Ref<string>;
    selectedLocalId: ComputedRef<number | null>;

    handleLevelChange: (level: string) => void;
    handleSearchChange: (query: string) => void;
    handleOccupancyChange: (filter: string) => void;
    selectWorkplaceById: (localId: number) => Promise<void>;
    clearSelection: () => Promise<void>;
  };
}
export function useIFCViewer(config: IFCViewerConfig): IIFCViewer {
  const modelLoading = reactive<ModelLoadingState>({
    isLoading: false,
    progress: 0,
    modelName: null,
  });

  const selectedLevel = ref<string>("all");
  const searchQuery = ref<string>("");
  const occupancyFilter = ref<string>("all");
  const selectedLocalId = computed<number | null>(() => {
    return workplaceManager.value?.selectedLocalId.value ?? null;
  });

  const availableLevels = computed<LevelsViewData[]>(() => {
    return workplaceManager.value?.workPlaceLevels.value ?? [];
  });

  const isLoading = computed<boolean>(() => {
    return workplaceManager.value?.isLoading.value ?? false;
  });

  const filteredWorkplaceCards = computed<
    WorkplaceCardData[]
  >(() => {
    const cards = workplaceManager.value?.workPlaces.value ?? [];

    const level = selectedLevel.value;
    const filter = occupancyFilter.value;
    const query = searchQuery.value.trim().toLowerCase();

    return cards.filter((card) => {
      if (level !== "all") {
        if (card.level?.name !== level) return false;
      }

      if (filter === "occupied" && !card.isOccupied) return false;
      if (filter === "vacant" && card.isOccupied) return false;

      if (!query) return true;
      const haystack = [
        card.workplaceNumber,
        card.employeeName ?? "",
        card.level?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  });

  const handleLevelChange = (level: string) => {
    selectedLevel.value = level;
  };

  const handleSearchChange = (query: string) => {
    searchQuery.value = query;
  };

  const handleOccupancyChange = (filter: string) => {
    occupancyFilter.value = filter;
  };

  const selectWorkplaceById = async (localId: number) => {
    const manager = workplaceManager.value;
    if (!manager) return;

    await manager.selectWorkplaceById(localId);
  };

  const clearSelection = async () => {
    await workplaceManager.value?.clearWorkplaceSelection();
  };

  let fragments: OBC.FragmentsManager | null = null;
  let highlighter: OBF.Highlighter | null = null;
  let raycaster: OBC.Raycasters | null = null;
  let world: OBC.SimpleWorld<
    OBC.SimpleScene,
    OBC.SimpleCamera,
    OBF.PostproductionRenderer
  > | null = null;


  const airplaneManager = shallowRef<IAirplaneManager | null>(null);
  const workplaceManager = shallowRef<IWorkplaceManager | null>(null);
  const dataAccessManager = shallowRef<IDataAccessManager | null>(null);
  const levelsManager = shallowRef<ILevelManager | null>(null);
  const selectManager = shallowRef<IIfcSelectManager | null>(null);

  const disposeViewer = () => {
    if (airplaneManager.value) {
      airplaneManager.value.dispose();
      airplaneManager.value = null;
    }

    if (workplaceManager.value) {
      workplaceManager.value.clearWorkplaces();
      workplaceManager.value = null;
    }

    if (world) {
      world!.dispose();
    }

    if (highlighter) {
      highlighter!.dispose();
    }

    viewerService.reset();
  };


  const setupViewer = async (containerRef: HTMLElement, employeeId?: string) => {
    viewerService.initViewer();
    const components = viewerService.getComponents();

    const worlds = components.get(OBC.Worlds);
    world = worlds.create<
      OBC.SimpleScene,
      OBC.SimpleCamera,
      OBF.PostproductionRenderer
    >();

    world.scene = new OBC.SimpleScene(components);
    world.scene.setup();
    world.scene.three.background = null;

    world.renderer = new OBF.PostproductionRenderer(components, containerRef);
    world.camera = new OBC.OrthoPerspectiveCamera(components);
    await world.camera.controls.setLookAt(68, 23, -8.5, 21.5, -5.5, 23);

    fragments = viewerService.getFragmentManager();

    world.camera.controls.addEventListener("rest", () =>
      fragments!.core.update(true),
    );

    if (!world) {
      throw new Error("World not initialized");
    }

    airplaneManager.value = useAirplaneManager(components, world);

    const airplaneConfigs = [
      {
        radius: 15,
        centerY: 10,
        speed: 0.5,
        initialAngle: 0,
      },
      {
        radius: 20,
        centerY: 12,
        speed: 0.4,
        initialAngle: Math.PI,
      },
    ];

    airplaneConfigs.forEach((config) => {
      airplaneManager.value!.createAirplane(config);
    });

    world.onCameraChanged.add((camera: any) => {
      for (const [, model] of fragments!.list) {
        model.useCamera(camera.three);
      }
      fragments!.core.update(true);
    });

    viewerService.onModelLoaded((model: FragmentsModel) => {
      console.log("Model loaded", model);
      model.useCamera(world!.camera.three);
      world!.scene.three.add(model.object);
    });

    const fragPaths = [config.modelPath];

    for (const path of fragPaths) {
      const modelId = path.split("/").pop()?.split(".").shift();
      if (!modelId) continue;

      modelLoading.modelName = modelId;
      modelLoading.isLoading = true;
      modelLoading.progress = 0;

      viewerService.onProgress(async (progress: number) => {
        console.log("Progress:", progress);
        modelLoading.progress = progress * 100;
      });
    }

    viewerService.onModelLoadProgressDone((modelId: string) => {
      modelLoading.isLoading = false;
      modelLoading.progress = 100;
      modelLoading.modelName = modelId;
    });

    await viewerService.loadModelByPath(fragPaths[0], config.modelName);

    raycaster = components.get(OBC.Raycasters);
    raycaster.get(world);

    highlighter = components.get(OBF.Highlighter);
    highlighter.setup({
      world,
      selectEnabled: false,
      selectMaterialDefinition: {
        color: new THREE.Color(config.selectionColor),
        opacity: 1,
        transparent: false,
        renderedFaces: 0,
      },
    });

    world.renderer.postproduction.enabled = true;

    const outliner = components.get(OBF.Outliner);
    outliner!.world = world!;
    outliner!.color = new THREE.Color(config.selectionColor);
    outliner!.thickness = 2;
    outliner!.fillColor = new THREE.Color(config.selectionColor);
    outliner!.fillOpacity = 0.1;

    outliner!.enabled = true;

    const boxer = components.get(OBC.BoundingBoxer);

    dataAccessManager.value = useDataAccessManager(fragments!);
    levelsManager.value = useLevels(dataAccessManager.value);
    selectManager.value = useIfcSelectManager(outliner, world, boxer);

    workplaceManager.value = useWorkplaceManager(
      dataAccessManager.value,
      levelsManager.value,
      selectManager.value,
      fragments!,
      world!,
    );

    const modelId = fragments!.list.values().next().value?.modelId;
    if (modelId && levelsManager.value) {
      await levelsManager.value.loadLevels(modelId);
      await workplaceManager.value.loadWorkplaces(modelId);
    }

    if (employeeId) {
      await workplaceManager.value.selectWorkplaceByEmployeeId(employeeId);
    }
  };

  return {
    disposeViewer,
    setupViewer,

    modelLoading,

    employeeWorkplace: {
      isLoading,
      filteredWorkplaceCards,
      availableLevels,
      selectedLevel,
      searchQuery,
      occupancyFilter,
      selectedLocalId,
      handleLevelChange,
      handleSearchChange,
      handleOccupancyChange,
      selectWorkplaceById,
      clearSelection,
    },
  };
}
