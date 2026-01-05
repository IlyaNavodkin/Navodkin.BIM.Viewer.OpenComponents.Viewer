import * as OBC from "@thatopen/components";
import * as THREE from "three";
import * as OBF from "@thatopen/components-front";
import { useIFCViewerStore } from "@/stores/useViewerCoreStore";

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
  outliner: IEmployeeViewerSelectionOutliner;

  init: () => void;
}

export const useSelection = (): IEmployeeViewerSelection => {
  const store = useIFCViewerStore();

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

    store.features.selection.highlighter.setup({
      world: world,
      selectName: SELECT_PLACEMENT_HIGHLIGHTER_NAME,
      selectEnabled: true,
      autoHighlightOnClick: true,
      selectMaterialDefinition: {
        color: new THREE.Color("red"),
        opacity: 0.9,
        transparent: true,
        renderedFaces: 1,
      },
      autoUpdateFragments: true,
    });

    store.features.selection.allPlacementsOutliner = createOutliner(
      new THREE.Color("#8B0000"),
      2,
      new THREE.Color("#8B0000"),
      0,
      world
    );

    store.features.selection.highlighter.updateColors();
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

  return {
    init,

    highlight,
    outliner,
  };
};
