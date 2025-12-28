import * as OBC from "@thatopen/components";
import * as THREE from "three";
import * as OBF from "@thatopen/components-front";
import { useViewerCoreStore } from "@/stores/useViewerCoreStore";

export const SELECT_HIGHLIGHTER_NAME = "select";
export const ALL_PLACEMENTS_HIGHLIGHTER_NAME = "allPlacements";
export const SELECT_PLACEMENT_HIGHLIGHTER_NAME = "selectPlacement";

/**
 * Фича для выделения элементов
 * Отвечает за создание и управление highlighter и outliner
 */
export const useSelection = () => {
  const store = useViewerCoreStore();

  const init = () => {
    if (!store.core.components.value || !store.core.currentWord.value) {
      throw new Error("Components и currentWord должны быть инициализированы");
    }

    const world = store.core.currentWord.value as OBC.SimpleWorld<
      OBC.SimpleScene,
      OBC.SimpleCamera,
      OBF.PostproductionRenderer
    >;
    store.features.selection.highlighter.value =
      store.core.components.value!.get(OBF.Highlighter);

    store.features.selection.highlighter.value.setup({
      world: world,
      selectName: SELECT_HIGHLIGHTER_NAME,
      selectEnabled: true,
      autoHighlightOnClick: false,
      selectMaterialDefinition: {
        color: new THREE.Color("blue"),
        opacity: 0.5,
        transparent: true,
        renderedFaces: 0,
      },
      autoUpdateFragments: true,
    });

    // Красный «все размещения»
    store.features.selection.highlighter.value.styles.set(
      ALL_PLACEMENTS_HIGHLIGHTER_NAME,
      {
        color: new THREE.Color("#ff0000"),
        opacity: 0.8,
        transparent: false,
        renderedFaces: 1,
      }
    );

    // Полупрозрачный жёлтый «выделение»
    store.features.selection.highlighter.value.styles.set(
      SELECT_PLACEMENT_HIGHLIGHTER_NAME,
      {
        color: new THREE.Color("#ffff66"),
        opacity: 0.8,
        transparent: true,
        renderedFaces: 1,
      }
    );

    store.features.selection.mainOutliner.value = createOutliner(
      new THREE.Color("blue"),
      1,
      new THREE.Color("blue"),
      0.2,
      world
    );

    if (store.features.selection.highlighter.value) {
      store.features.selection.highlighter.value.events[
        SELECT_PLACEMENT_HIGHLIGHTER_NAME
      ].onHighlight.add((map: any) => {
        console.log("selectPlacement highlighted:", map);
        store.features.selection.mainOutliner.value?.clean();
        store.features.selection.mainOutliner.value?.addItems(map);
      });

      store.features.selection.highlighter.value.events[
        ALL_PLACEMENTS_HIGHLIGHTER_NAME
      ].onHighlight.add((map: any) => {
        console.log("allPlacements highlighted:", map);
      });
    }

    store.features.selection.highlighter.value.updateColors();
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
    const outliner = store.core.components.value?.get(OBF.Outliner);
    outliner!.world = world;
    outliner!.color = color;
    outliner!.thickness = thickness;
    outliner!.fillColor = fillColor;
    outliner!.fillOpacity = fillOpacity;

    outliner!.enabled = true;
    return outliner;
  }

  const drawMinSelection = (modelIdMap: OBC.ModelIdMap) => {
    store.features.selection.mainOutliner.value?.addItems(modelIdMap);
  };

  const clearMinSelection = () => {
    store.features.selection.mainOutliner.value?.clean();
  };

  const clearHighlight = () => {
    if (!store.features.selection.highlighter.value) return;
    store.features.selection.highlighter.value!.clear(SELECT_HIGHLIGHTER_NAME);
  };

  const createCustomHighlighter = (
    name: string,
    color: string | THREE.Color = "red",
    opacity: number = 1,
    transparent: boolean = false,
    renderedFaces: number = 0
  ) => {
    if (!store.features.selection.highlighter.value) return;

    const colorObj = typeof color === "string" ? new THREE.Color(color) : color;

    store.features.selection.highlighter.value.styles.set(name, {
      color: colorObj,
      opacity,
      transparent,
      renderedFaces,
    });

    store.features.selection.highlighter.value.events[name].onHighlight.add(
      (map: any) => {
        console.log(`Highlighted with ${name}`, map);
      }
    );

    store.features.selection.highlighter.value.events[name].onClear.add(
      (map: any) => {
        console.log(`${name} highlighter cleared`, map);
      }
    );
  };

  /**
   * Применяет кастомный highlighter к выделенным элементам
   * @param customHighlighterName - имя кастомного highlighter
   * @param clearSelection - очищать ли выделение после применения
   */
  const applyCustomHighlight = async (
    customHighlighterName: string,
    clearSelection: boolean = false
  ) => {
    if (!store.features.selection.highlighter.value) return;
    if (
      !store.features.selection.highlighter.value.styles.has(
        customHighlighterName
      )
    ) {
      console.warn(
        `Custom highlighter "${customHighlighterName}" does not exist`
      );
      return;
    }

    const selection =
      store.features.selection.highlighter.value.selection.select;
    if (OBC.ModelIdMapUtils.isEmpty(selection)) {
      console.warn("No items selected");
      return;
    }

    await store.features.selection.highlighter.value.highlightByID(
      customHighlighterName,
      selection,
      false
    );

    // Если нужно очистить выделение после применения кастомного highlighter
    if (clearSelection) {
      await store.features.selection.highlighter.value.clear(
        SELECT_HIGHLIGHTER_NAME
      );
    }
  };

  /**
   * Очищает кастомный highlighter
   * @param customHighlighterName - имя кастомного highlighter
   * @param onlySelected - очищать только выделенные элементы или все
   * @param clearSelection - очищать ли также выделение
   */
  const resetCustomHighlighter = async (
    customHighlighterName: string,
    onlySelected: boolean = true,
    clearSelection: boolean = false
  ) => {
    if (!store.features.selection.highlighter.value) return;
    if (
      !store.features.selection.highlighter.value.styles.has(
        customHighlighterName
      )
    ) {
      console.warn(
        `Custom highlighter "${customHighlighterName}" does not exist`
      );
      return;
    }

    const modelIdMap =
      store.features.selection.highlighter.value.selection.select;
    await store.features.selection.highlighter.value.clear(
      customHighlighterName,
      onlySelected ? modelIdMap : undefined
    );

    // Очищаем выделение, если нужно
    if (clearSelection) {
      await store.features.selection.highlighter.value.clear(
        SELECT_HIGHLIGHTER_NAME
      );
    }
  };

  return {
    init,
    clearOutlines: clearHighlight,
    createCustomHighlighter,
    applyCustomHighlight,
    resetCustomHighlighter,
  };
};
