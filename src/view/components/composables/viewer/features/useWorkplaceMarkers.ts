import { watch, createApp, ref } from "vue";
import { useViewerManagerStore } from "@/stores/useViewerManagerStore";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { WorkplaceCardData } from "@/view/components/viewport/WorkplaceCard.vue";
import WorkplaceMarker from "@/view/components/viewport/WorkplaceMarker.vue";

export interface IWorkplaceMarkers {
  init: () => void;
  createMarkersForWorkplaces: (
    workplaceCards: WorkplaceCardData[]
  ) => Promise<void>;
  clearAllMarkers: () => void;
  updateMarkerVisibility: (localId: number, visible: boolean) => void;
  dispose: () => void;
}

export type MarkerState = {
  app: any;
  htmlElement: HTMLDivElement;
  workplaceId: number;
};

export type MarkerObject = MarkerState & {
  css2dObject: CSS2DObject;
};

export const useWorkplaceMarkers = (viewerId: string): IWorkplaceMarkers => {
  const viewerManager = useViewerManagerStore();
  const viewerStore = viewerManager.getViewer(viewerId);

  const markerObjects = ref<MarkerObject[]>([]);

  // ✅ Устанавливаем callback сразу при создании composable
  viewerStore.features.employeeWorkplace.markers.setOnSelectCallback(
    (localId: number) => {
      console.log("🟢 useWorkplaceMarkers: callback triggered for", localId);
      const event = new CustomEvent("workplace-marker-select", {
        detail: { localId },
      });
      window.dispatchEvent(event);
    }
  );

  /**
   * Инициализация менеджера маркеров
   */
  const init = () => {
    if (!viewerStore.core.components) {
      console.error("Components not initialized");
      return;
    }

    try {
      // Инициализируем простой маркер-менеджер (пустой объект для совместимости со store)
      const markerManager = {} as OBF.Marker;
      viewerStore.features.employeeWorkplace.markers.initialize(markerManager);

      console.log("Marker system initialized");
    } catch (error) {
      console.error("Error initializing marker system:", error);
    }
  };

  /**
   * Получение 3D позиции центра элемента
   */
  const getElementCenter = async (
    localId: number
  ): Promise<THREE.Vector3 | null> => {
    const components = viewerStore.core.components;
    const model = viewerStore.modelManager.model;

    if (!components || !model) {
      return null;
    }

    try {
      const modelIdMap = {
        [model.modelId]: new Set([localId]),
      };

      // Используем FragmentsManager.getBBoxes для получения bounding box
      const fragmentsManager = components.get(OBC.FragmentsManager);
      const boundingBoxes = await fragmentsManager.getBBoxes(modelIdMap);

      if (!boundingBoxes || boundingBoxes.length === 0) {
        console.warn(`No bounding box found for localId ${localId}`);
        return null;
      }

      // Берем первый bounding box
      const boundingBox = boundingBoxes[0];
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);

      // Смещаем маркер чуть выше центра элемента (на 0.5 метра)
      center.y += 0.5;

      return center;
    } catch (error) {
      console.error(`Error getting center for localId ${localId}:`, error);
      return null;
    }
  };

  /**
   * Создание HTML-элемента маркера через Vue компонент
   */
  const createMarkerElement = (card: WorkplaceCardData): MarkerState => {
    const container = document.createElement("div");
    container.style.pointerEvents = "auto";

    // Обработчики событий с остановкой всплытия на контейнере
    container.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
    });

    container.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });

    container.addEventListener("touchstart", (e) => {
      e.stopPropagation();
    });

    // ✅ Создаем Vue приложение с передачей viewerId
    const app = createApp(WorkplaceMarker, {
      card,
      viewerId,
    });

    // Монтируем компонент
    app.mount(container);

    return {
      app,
      htmlElement: container,
      workplaceId: card.localId,
    };
  };

  /**
   * Создание маркеров для всех рабочих мест
   */
  const createMarkersForWorkplaces = async (
    workplaceCards: WorkplaceCardData[]
  ): Promise<void> => {
    console.log("🔵 createMarkersForWorkplaces CALLED");
    console.trace("Call stack:");

    const world = viewerStore.core.currentWorld;

    if (!world) {
      console.error("World not initialized");
      return;
    }

    // Очищаем все существующие маркеры
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

      // ✅ Теперь не передаем callback - компонент сам обратится к store
      const markerState = createMarkerElement(card);

      try {
        // Создаем CSS2DObject для HTML-маркера
        const css2dObject = new CSS2DObject(markerState.htmlElement);
        css2dObject.position.copy(position);
        css2dObject.name = `workplace-marker-${card.localId}`;

        // Добавляем маркер в сцену
        world.scene.three.add(css2dObject);

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
  };

  /**
   * Очистка всех маркеров
   */
  const clearAllMarkers = () => {
    console.log("🔴 clearAllMarkers CALLED");
    console.trace("Call stack:");

    const world = viewerStore.core.currentWorld;

    if (!world) {
      return;
    }

    // Удаляем все маркеры из сцены
    markerObjects.value.forEach((markerObject) => {
      try {
        world.scene.three.remove(markerObject.css2dObject);

        // Размонтируем Vue приложение
        const app = markerObject.app;
        if (app) {
          app.unmount();
        }

        markerObject.htmlElement.remove(); // Удаляем DOM элемент
      } catch (error) {
        console.warn(`Error removing marker:`, error);
      }
    });

    markerObjects.value = [];

    console.log("All markers cleared");
  };

  /**
   * Управление видимостью конкретного маркера (не удаляет, а скрывает/показывает)
   */
  const updateMarkerVisibility = (localId: number, visible: boolean) => {
    const markerObject = markerObjects.value.find(
      (markerObject) => markerObject.workplaceId === localId
    );

    if (!markerObject) {
      return;
    }

    try {
      // Просто меняем видимость, не удаляем маркер
      markerObject.css2dObject.visible = visible;
      if (markerObject.htmlElement) {
        markerObject.htmlElement.style.display = visible ? "block" : "none";
      }

      // ✅ Обновляем видимость в viewer store
      viewerStore.features.employeeWorkplace.markers.setVisibility(
        localId,
        visible
      );
    } catch (error) {
      console.warn(`Error updating marker visibility for ${localId}:`, error);
    }
  };

  /**
   * Очистка ресурсов
   */
  const dispose = () => {
    clearAllMarkers();
    viewerStore.features.employeeWorkplace.markers.clear();
  };

  // ✅ Отслеживание изменений выделенного элемента - используем viewer store
  watch(
    () => viewerStore.features.selection.highlightedElement,
    (highlightedElement) => {
      const selectedLocalId = highlightedElement?.localId ?? null;

      console.log("🟣 Selection changed to:", selectedLocalId);

      if (selectedLocalId !== null) {
        // Выделяем маркер через viewer store
        viewerStore.features.employeeWorkplace.markers.select(selectedLocalId);
      } else {
        // Сбрасываем выделение через viewer store
        viewerStore.features.employeeWorkplace.markers.clearSelection();
      }
    }
  );
  return {
    init,
    createMarkersForWorkplaces,
    clearAllMarkers,
    updateMarkerVisibility,
    dispose,
  };
};
