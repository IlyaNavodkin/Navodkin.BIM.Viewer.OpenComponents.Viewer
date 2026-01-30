import { IDataAccessManager } from "./useDataAccess";
import { createApp, ref, Ref } from "vue";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import WorkplaceMarker from "../components/WorkplaceMarker.vue";
import { WorkplaceCardData, type IWorkplaceMarkerState } from "./useWorkplaceManager";

export interface IWorkplaceMarkers {
  createMarkersForWorkplaces: (
    workplaceCards: WorkplaceCardData[]
  ) => Promise<void>;
  clearAllMarkers: () => void;
  updateMarkerVisibility: (localId: number, visible: boolean) => void;
  dispose: () => void;

  isLoading: Ref<boolean>;
}

export type MarkerState = {
  app: any;
  htmlElement: HTMLDivElement;
  workplaceId: number;
};

export type MarkerObject = MarkerState & {
  css2dObject: CSS2DObject;
};

export const useWorkplaceMarkers = (
  fragments: OBC.FragmentsManager,
  dataAccessManager: IDataAccessManager,
  currentWorld: OBC.SimpleWorld<
    OBC.SimpleScene,
    OBC.SimpleCamera,
    OBF.PostproductionRenderer
  >,
  markerState: IWorkplaceMarkerState
): IWorkplaceMarkers => {
  const isLoading = ref(false);

  const markerObjects = ref<MarkerObject[]>([]);

  const getElementCenter = async (
    localId: number
  ): Promise<THREE.Vector3 | null> => {
    const model = await dataAccessManager.getFragmentModelByLocalId(localId);

    if (!model) {
      return null;
    }

    try {
      const modelIdMap = {
        [model.modelId]: new Set([localId]),
      };

      const boundingBoxes = await fragments.getBBoxes(modelIdMap);

      if (!boundingBoxes || boundingBoxes.length === 0) {
        console.warn(`No bounding box found for localId ${localId}`);
        return null;
      }

      const boundingBox = boundingBoxes[0];
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);

      center.y += 0.5;

      return center;
    } catch (error) {
      console.error(`Error getting center for localId ${localId}:`, error);
      return null;
    }
  };

  const createMarkerElement = (card: WorkplaceCardData): MarkerState => {
    const container = document.createElement("div");
    container.style.pointerEvents = "auto";

    container.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
    });

    container.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });

    container.addEventListener("touchstart", (e) => {
      e.stopPropagation();
    });

    const app = createApp(WorkplaceMarker, { card });
    // Передаем markerState через provide для дочернего компонента
    app.provide("markerState", markerState);

    app.mount(container);

    return {
      app,
      htmlElement: container,
      workplaceId: card.localId,
    };
  };

  const createMarkersForWorkplaces = async (
    workplaceCards: WorkplaceCardData[]
  ): Promise<void> => {
    console.log("🔵 createMarkersForWorkplaces CALLED");
    console.trace("Call stack:");

    isLoading.value = true;
    if (!currentWorld) {
      console.error("World not initialized");
      return;
    }

    clearAllMarkers();

    console.log(`Creating markers for ${workplaceCards.length} workplaces...`);

    for (const card of workplaceCards) {
      const position = await getElementCenter(card.localId);

      if (!position) {
        console.warn(
          `Could not get position for workplace ${card.workplaceNumber}`
        );
        continue;
      }

      const markerState = createMarkerElement(card);

      try {
        const css2dObject = new CSS2DObject(markerState.htmlElement);
        css2dObject.position.copy(position);
        css2dObject.name = `workplace-marker-${card.localId}`;

        currentWorld.scene.three.add(css2dObject);

        const markerObject: MarkerObject = {
          css2dObject,
          app: markerState.app,
          htmlElement: markerState.htmlElement,
          workplaceId: markerState.workplaceId,
        };
        markerObjects.value.push(markerObject);
      } catch (error) {
        console.error(
          `Error adding marker for ${card.workplaceNumber}:`,
          error
        );
      }
    }

    isLoading.value = false;
  };

  const clearAllMarkers = () => {
    console.log("🔴 clearAllMarkers CALLED");
    console.trace("Call stack:");


    markerObjects.value.forEach((markerObject) => {
      try {
        currentWorld.scene.three.remove(markerObject.css2dObject);

        const app = markerObject.app;
        if (app) {
          app.unmount();
        }

        markerObject.htmlElement.remove();
      } catch (error) {
        console.warn(`Error removing marker:`, error);
      }
    });

    markerObjects.value = [];

    console.log("All markers cleared");
  };

  const updateMarkerVisibility = (localId: number, visible: boolean) => {
    const markerObject = markerObjects.value.find(
      (markerObject) => markerObject.workplaceId === localId
    );

    if (!markerObject) {
      return;
    }

    try {
      markerObject.css2dObject.visible = visible;
      if (markerObject.htmlElement) {
        markerObject.htmlElement.style.display = visible ? "block" : "none";
      }

      markerState.setVisibility(localId, visible);
    } catch (error) {
      console.warn(`Error updating marker visibility for ${localId}:`, error);
    }
  };

  const dispose = () => {
    clearAllMarkers();
    markerState.clear();
  };

  return {
    createMarkersForWorkplaces,
    clearAllMarkers,
    updateMarkerVisibility,
    dispose,

    isLoading,
  };
};