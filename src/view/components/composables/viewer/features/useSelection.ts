import * as OBC from "@thatopen/components";
import * as THREE from "three";
import * as OBF from "@thatopen/components-front";
import { useIFCViewerStore } from "@/stores/useViewerCoreStore";
import { useDataAccess } from "../data/useDataAccess";
import { RenderedFaces } from "@thatopen/fragments";

export const SELECT_PLACEMENT_HIGHLIGHTER_NAME = "selectPlacement";

export interface IEmployeeViewerSelectionHighlight {
  clear: () => void;
  set: (modelIdMap: OBC.ModelIdMap) => void;
}

export interface IEmployeeViewerSelectionOutliner {
  clear: () => void;
  set: (modelIdMap: OBC.ModelIdMap) => void;
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
    if (!store.core.components || !store.core.currentWord) {
      throw new Error("Components and currentWord must be initialized");
    }

    const world = store.core.currentWord as OBC.SimpleWorld<
      OBC.SimpleScene,
      OBC.SimpleCamera,
      OBF.PostproductionRenderer
    >;
    store.features.selection.highlighter = store.core.components!.get(
      OBF.Highlighter
    );

    // Настройка основного highlighter для выделения
    store.features.selection.highlighter.setup({
      world: world,
      selectName: SELECT_PLACEMENT_HIGHLIGHTER_NAME,
      selectEnabled: true,
      autoHighlightOnClick: false,
      selectMaterialDefinition: {
        color: new THREE.Color("red"),
        opacity: 0.5,
        transparent: false,
        renderedFaces: RenderedFaces.ONE,
      },
      autoUpdateFragments: true,
    });

    store.features.selection.allPlacementsOutliner = createOutliner(
      new THREE.Color("#8B0000"),
      3,
      new THREE.Color("#8B0000"),
      0.4,
      world
    );

    store.features.selection.highlighter.updateColors();

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
    clear: () => {
      if (!store.features.selection.highlighter) return;
      store.features.selection.highlighter!.clear(
        SELECT_PLACEMENT_HIGHLIGHTER_NAME
      );
      store.features.selection.currentSelectedElement = undefined;
    },
    set: (modelIdMap: OBC.ModelIdMap) => {
      if (!store.features.selection.highlighter) return;
      highlight.clear();
      store.features.selection.highlighter!.highlightByID(
        SELECT_PLACEMENT_HIGHLIGHTER_NAME,
        modelIdMap,
        true,
        true
      );
      store.features.selection.currentSelectedElement = {
        modelId: Object.keys(modelIdMap)[0],
        localId: Array.from(modelIdMap[Object.keys(modelIdMap)[0]])[0],
      };
    },
  };

  const hover: IEmployeeViewerSelectionOutliner = {
    clear: () => {
      if (!store.features.selection.allPlacementsOutliner) return;
      store.features.selection.allPlacementsOutliner!.clean();
      store.features.selection.currentHoveredElement = undefined;
    },
    set: (modelIdMap: OBC.ModelIdMap) => {
      if (!store.features.selection.allPlacementsOutliner) return;
      hover.clear();
      store.features.selection.allPlacementsOutliner!.clean();
      store.features.selection.allPlacementsOutliner!.addItems(modelIdMap);
      store.features.selection.currentHoveredElement = {
        modelId: Object.keys(modelIdMap)[0],
        localId: Array.from(modelIdMap[Object.keys(modelIdMap)[0]])[0],
      };
    },
  };

  const handleMouseOver = async (event: MouseEvent) => {
    if (!raycaster || !store.features.selection.highlighter) {
      return;
    }

    // Проверяем, не находится ли курсор над панелью
    const target = event.target as HTMLElement;
    if (target.closest("[data-workplace-panel]")) {
      // Если курсор над панелью - не обрабатываем hover
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
          hover.clear();
          return;
        }

        const modelIdMap = {
          [modelId]: new Set([localId]),
        };

        hover.set(modelIdMap);
      } else {
        hover.clear();
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
          highlight.clear();
          return;
        }

        highlight.set(modelIdMap);
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
