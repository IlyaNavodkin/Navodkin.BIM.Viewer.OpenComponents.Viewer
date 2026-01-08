import * as OBC from "@thatopen/components";
import * as THREE from "three";
import * as OBF from "@thatopen/components-front";
import { useIFCViewerStore } from "@/stores/useViewerCoreStore";
import { useDataAccess } from "../data/useDataAccess";

export const SELECT_PLACEMENT_HIGHLIGHTER_NAME = "selectPlacement";

export interface IEmployeeViewerSelectionHighlight {
  clear: () => Promise<void>;
  set: (modelIdMap: OBC.ModelIdMap) => Promise<void>;
}

export interface IEmployeeViewerSelectionOutliner {
  clear: () => Promise<void>;
  set: (modelIdMap: OBC.ModelIdMap) => Promise<void>;
}

export interface IEmployeeViewerSelection {
  highlight: IEmployeeViewerSelectionHighlight;
  hover: IEmployeeViewerSelectionOutliner;

  init: () => void;
}

export const useSelection = (): IEmployeeViewerSelection => {
  const store = useIFCViewerStore();
  const dataAccess = useDataAccess();
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
    const highlighter = store.core.components!.get(OBF.Highlighter);

    // Настройка основного highlighter для выделения (как в документации)
    highlighter.setup({
      world: world,
      selectName: SELECT_PLACEMENT_HIGHLIGHTER_NAME,
      selectEnabled: true,
      autoHighlightOnClick: false,
      selectMaterialDefinition: {
        color: new THREE.Color("red"),
        opacity: 0.5,
        transparent: false,
        renderedFaces: 0,
      },
    });

    const outliner = createOutliner(
      new THREE.Color("#8B0000"),
      3,
      new THREE.Color("#8B0000"),
      0.4,
      world
    );

    if (outliner) {
      store.initializeSelection(highlighter, outliner);
    }

    highlighter.updateColors();

    // Инициализация raycaster
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

    // Автоматически включаем hover highlight
    store.core.container.addEventListener("mousemove", handleMouseOver);

    // Добавляем обработчик двойного клика
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

  const highlight: IEmployeeViewerSelectionHighlight = {
    clear: async () => {
      if (!store.features.selection.highlighter) return;
      await store.features.selection.highlighter!.clear(
        SELECT_PLACEMENT_HIGHLIGHTER_NAME
      );
      store.setCurrentSelectedElement(undefined);
    },
    set: async (modelIdMap: OBC.ModelIdMap) => {
      if (!store.features.selection.highlighter) return;

      const newLocalId = Array.from(modelIdMap[Object.keys(modelIdMap)[0]])[0];
      const currentLocalId =
        store.features.selection.highlightedElement?.localId;

      // Оптимизация: не перевыделяем тот же элемент
      if (currentLocalId === newLocalId) return;

      store.setCurrentSelectedElement({
        modelId: Object.keys(modelIdMap)[0],
        localId: newLocalId,
      });
      // Как в документации: только 3 параметра, без fillMesh
      await store.features.selection.highlighter!.highlightByID(
        SELECT_PLACEMENT_HIGHLIGHTER_NAME,
        modelIdMap,
        true,
        true
      );
    },
  };

  const hover: IEmployeeViewerSelectionOutliner = {
    clear: async () => {
      if (!store.features.selection.outliner) return;
      await store.features.selection.outliner!.clean();
      store.setCurrentHoveredElement(undefined);
    },
    set: async (modelIdMap: OBC.ModelIdMap) => {
      if (!store.features.selection.outliner) return;
      await hover.clear();
      await store.features.selection.outliner!.addItems(modelIdMap);
      store.setCurrentHoveredElement({
        modelId: Object.keys(modelIdMap)[0],
        localId: Array.from(modelIdMap[Object.keys(modelIdMap)[0]])[0],
      });
    },
  };

  const handleMouseOver = async () => {
    if (!raycaster || !store.features.selection.highlighter) {
      return;
    }

    try {
      const result = (await raycaster.castRay()) as any;

      if (result && result.object) {
        const modelId = result.fragments.modelId;
        const localId = result.localId;

        if (
          !store.features.elementsData.employeeWorkplaces.data.some(
            (workplace) => workplace.localId === localId
          )
        ) {
          await hover.clear();
          return;
        }

        const modelIdMap = {
          [modelId]: new Set([localId]),
        };

        await hover.set(modelIdMap);
      } else {
        await hover.clear();
      }
    } catch (error) {
      console.warn("Error during raycast:", error);
    }
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
          !store.features.elementsData.employeeWorkplaces.data.some(
            (workplace) => workplace.localId === localId
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
    hover,
  };
};
