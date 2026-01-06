import * as OBC from "@thatopen/components";
import * as THREE from "three";
import * as OBF from "@thatopen/components-front";
import { useIFCViewerStore } from "@/stores/useViewerCoreStore";
import { useDataAccess } from "../data/useDataAccess";
import { RenderedFaces } from "@thatopen/fragments";

export const SELECT_PLACEMENT_HIGHLIGHTER_NAME = "selectPlacement";
export const HOVER_HIGHLIGHTER_NAME = "hoverHighlight";

export interface IEmployeeViewerSelectionHighlight {
  clear: () => void;
  set: (modelIdMap: OBC.ModelIdMap) => void;
}

export interface IEmployeeViewerSelectionOutliner {
  clear: () => void;
  set: (modelIdMap: OBC.ModelIdMap) => void;
}

export interface IEmployeeViewerHoverHighlight {
  clear: () => void;
}

export interface IEmployeeViewerSelection {
  highlight: IEmployeeViewerSelectionHighlight;
  outliner: IEmployeeViewerSelectionOutliner;
  hover: IEmployeeViewerHoverHighlight;

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
        opacity: 0.9,
        transparent: true,
        renderedFaces: 1,
      },
      autoUpdateFragments: true,
    });

    store.features.selection.highlighter.styles.set(HOVER_HIGHLIGHTER_NAME, {
      color: new THREE.Color("red"),
      opacity: 0.5,
      transparent: false,
      renderedFaces: RenderedFaces.ONE,
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
    },
    set: (modelIdMap: OBC.ModelIdMap) => {
      if (!store.features.selection.highlighter) return;
      store.features.selection.highlighter!.highlightByID(
        SELECT_PLACEMENT_HIGHLIGHTER_NAME,
        modelIdMap,
        true,
        true
      );
    },
  };

  const outliner: IEmployeeViewerSelectionOutliner = {
    clear: () => {
      if (!store.features.selection.allPlacementsOutliner) return;
      store.features.selection.allPlacementsOutliner!.clean();
    },
    set: (modelIdMap: OBC.ModelIdMap) => {
      if (!store.features.selection.allPlacementsOutliner) return;
      store.features.selection.allPlacementsOutliner!.addItems(modelIdMap);
    },
  };

  const handleMouseOver = async () => {
    if (!raycaster || !store.features.selection.highlighter) {
      return;
    }

    try {
      const result = (await raycaster.castRay()) as any;

      if (result && result.object) {
        // Получаем modelId и localId из результата raycast
        const modelId = result.fragments.modelId;
        const localId = result.localId;

        if (
          !store.features.elementsData.employeeWorkplaces.data.some(
            (workplace) => workplace.localId === localId
          )
        ) {
          store.features.selection.allPlacementsOutliner?.clean();
          store.features.selection.currentHoveredElement = undefined;
          return;
        }

        store.features.selection.allPlacementsOutliner?.clean();

        const modelIdMap = {
          [modelId]: new Set([localId]),
        };

        store.features.selection.allPlacementsOutliner?.addItems(modelIdMap);

        // Сохраняем текущий подсвеченный элемент
        store.features.selection.currentHoveredElement = {
          modelId,
          localId,
        };
      } else {
        // Если ничего не попало под курсор, очищаем подсветку
        if (store.features.selection.currentHoveredElement) {
          store.features.selection.allPlacementsOutliner?.clean();
          store.features.selection.currentHoveredElement = undefined;
        }
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
          store.features.selection.highlighter?.clear(HOVER_HIGHLIGHTER_NAME);
          store.features.selection.currentHoveredElement = undefined;
          return;
        }

        store.features.selection.highlighter?.clear(HOVER_HIGHLIGHTER_NAME);
        store.features.selection.highlighter?.highlightByID(
          HOVER_HIGHLIGHTER_NAME,
          modelIdMap,
          true,
          true
        );
      } else {
        console.log("=== Double Click ===");
        console.log("No object under cursor");
        console.log("===================");
      }
    } catch (error) {
      console.warn("Error during double click raycast:", error);
    }
  };

  const hover: IEmployeeViewerHoverHighlight = {
    clear: () => {
      if (!store.features.selection.highlighter) return;
      store.features.selection.highlighter.clear(HOVER_HIGHLIGHTER_NAME);
      store.features.selection.currentHoveredElement = undefined;
    },
  };

  return {
    init,

    highlight,
    outliner,
    hover,
  };
};
