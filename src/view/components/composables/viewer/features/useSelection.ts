import * as OBC from "@thatopen/components";
import * as THREE from "three";
import * as OBF from "@thatopen/components-front";
import { useViewerManagerStore } from "@/stores/useViewerManagerStore";
import { useDataAccess } from "../data/useDataAccess";

export interface IEmployeeViewerSelectionHighlight {
  clear: () => Promise<void>;
  set: (modelIdMap: OBC.ModelIdMap) => Promise<void>;
}

export interface IEmployeeViewerSelection {
  highlight: IEmployeeViewerSelectionHighlight;
  init: () => void;
}

export const useSelection = (viewerId: string): IEmployeeViewerSelection => {
  const viewerManager = useViewerManagerStore();
  const store = viewerManager.getViewer(viewerId);
  const dataAccess = useDataAccess(viewerId);
  let raycaster: any = null;

  const init = () => {
    if (!store.core.components || !store.core.currentWorld) {
      throw new Error("Components and currentWord must be initialized");
    }

    const world = store.core.currentWorld as OBC.SimpleWorld<
      OBC.SimpleScene,
      OBC.SimpleCamera,
      OBF.PostproductionRenderer
    >;

    const outliner = createOutliner(
      new THREE.Color("#8B0000"),
      3,
      new THREE.Color("#8B0000"),
      0.4,
      world
    );

    if (outliner) {
      store.features.selection.initialize(outliner);
    }

    setupRaycaster(world);
  };

  const setupRaycaster = (
    world: OBC.SimpleWorld<
      OBC.SimpleScene,
      OBC.SimpleCamera,
      OBF.PostproductionRenderer
    >
  ) => {
    if (!store.core.components || !store.core.container) {
      return;
    }

    const casters = store.core.components.get(OBC.Raycasters);
    raycaster = casters.get(world);

    store.core.container.addEventListener("dblclick", handleDoubleClick);
  };

  function createOutliner(
    color: THREE.Color,
    thickness: number,
    fillColor: THREE.Color,
    fillOpacity: number,
    world: OBC.SimpleWorld<
      OBC.SimpleScene,
      OBC.SimpleCamera,
      OBF.PostproductionRenderer
    >
  ) {
    const outliner = store.core.components?.get(OBF.Outliner);
    outliner!.world = world;
    outliner!.color = color;
    outliner!.thickness = thickness;
    outliner!.fillColor = fillColor;
    outliner!.fillOpacity = fillOpacity;

    outliner!.enabled = true;
    return outliner;
  }

  // Функция для перемещения камеры к выбранному объекту
  const fitCameraToSelection = async (modelIdMap: OBC.ModelIdMap) => {
    if (!store.core.components || !store.core.currentWorld) return;

    const world = store.core.currentWorld as OBC.SimpleWorld<
      OBC.SimpleScene,
      OBC.SimpleCamera,
      OBF.PostproductionRenderer
    >;

    try {
      const boxer = store.core.components.get(OBC.BoundingBoxer);

      // Получаем bounding box для выбранных элементов
      boxer.list.clear();
      await boxer.addFromModelIdMap(modelIdMap);
      const box = boxer.get();
      boxer.list.clear();

      if (box) {
        // Вычисляем сферу из bounding box
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);

        // Перемещаем камеру к сфере
        if (world.camera.hasCameraControls()) {
          await world.camera.controls.fitToSphere(sphere, true);
        }
      }
    } catch (error) {
      console.warn("Error fitting camera to selection:", error);
    }
  };

  // Теперь highlight использует outliner (для клика/выбора)
  const highlight: IEmployeeViewerSelectionHighlight = {
    clear: async () => {
      if (!store.features.selection.outliner) return;
      await store.features.selection.outliner!.clean();
      store.features.selection.setHighlightedElement(undefined);
    },
    set: async (modelIdMap: OBC.ModelIdMap) => {
      if (!store.features.selection.outliner) return;

      const newLocalId = Array.from(modelIdMap[Object.keys(modelIdMap)[0]])[0];
      const currentLocalId =
        store.features.selection.highlightedElement?.localId;

      // Оптимизация: не перевыделяем тот же элемент
      if (currentLocalId === newLocalId) return;

      // ВАЖНО: сначала очищаем визуальное выделение
      await store.features.selection.outliner!.clean();

      // Затем устанавливаем новый выбранный элемент
      store.features.selection.setHighlightedElement({
        modelId: Object.keys(modelIdMap)[0],
        localId: newLocalId,
      });

      // Добавляем визуальное выделение
      await store.features.selection.outliner!.addItems(modelIdMap);

      // Перемещаем камеру к выбранному объекту
      await fitCameraToSelection(modelIdMap);
    },
  };

  const handleDoubleClick = async () => {
    if (!raycaster) {
      return;
    }

    try {
      const result = (await raycaster.castRay()) as any;

      if (result && result.object) {
        // Получаем modelId и localId из результата raycast
        const modelId = result.fragments.modelId;
        const localId = result.localId;

        // Создаём modelIdMap
        const modelIdMap = {
          [modelId]: new Set([localId]),
        };

        console.log("=== Double Click ===");
        console.log("Result:", result);
        console.log("ModelIdMap:", modelIdMap);
        console.log("ModelId:", modelId);
        console.log("LocalId:", localId);
        console.log("===================");

        const entity = await dataAccess.getEntityByLocalId(localId, modelId);

        console.log("Entity:", entity);

        if (
          !store.features.employeeWorkplace.workplaceCards.data.some(
            (card) => card.localId === localId
          )
        ) {
          await highlight.clear();
          return;
        }

        await highlight.set(modelIdMap);
      } else {
        console.log("=== Double Click ===");
        console.log("No object under cursor");
        console.log("===================");
      }
    } catch (error) {
      console.warn("Error during double click raycast:", error);
    }
  };

  return {
    init,
    highlight,
  };
};
