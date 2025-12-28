import { shallowRef, type Ref } from "vue";
import * as OBC from "@thatopen/components";
import * as THREE from "three";
import * as FRAGS from "@thatopen/fragments";
import * as OBF from "@thatopen/components-front";

export const SELECT_HIGHLIGHTER_NAME = "select";
export const ALL_PLACEMENTS_HIGHLIGHTER_NAME = "allPlacements";
export const SELECT_PLACEMENT_HIGHLIGHTER_NAME = "selectPlacement";

/**
 * Фича для выделения элементов
 * Отвечает за выделение элементов с помощью highlighter и outliner
 */
export const useSelection = (
  components: Ref<OBC.Components | undefined>,
  currentWord: Ref<
    | OBC.SimpleWorld<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>
    | undefined
  >
) => {
  if (!components.value || !currentWord.value) {
    throw new Error("Components и currentWord должны быть инициализированы");
  }

  const componentsValue = components.value;
  const world = currentWord.value;

  // Получаем FragmentsManager для работы с данными элементов
  const fragments = componentsValue.get(OBC.FragmentsManager);

  const highlighter = shallowRef<OBF.Highlighter | undefined>(undefined);

  highlighter.value = componentsValue.get(OBF.Highlighter);

  highlighter.value.setup({
    world,
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

  highlighter.value.styles.set(ALL_PLACEMENTS_HIGHLIGHTER_NAME, {
    color: new THREE.Color("#ff0000"),
    opacity: 0.8,
    transparent: false,
    renderedFaces: 1,
  });

  // Полупрозрачный жёлтый «выделение»
  highlighter.value.styles.set(SELECT_PLACEMENT_HIGHLIGHTER_NAME, {
    color: new THREE.Color("#ffff66"),
    opacity: 0.8,
    transparent: true,
    renderedFaces: 1,
  });

  // Проверяем, что используется PostproductionRenderer и включаем postproduction
  // Outliner требует включенный postproduction для работы
  if (world.renderer instanceof OBF.PostproductionRenderer) {
    const { postproduction } = world.renderer;
    postproduction.enabled = true;
  } else {
    console.warn(
      "Outliner requires PostproductionRenderer. Current renderer type:",
      world.renderer?.constructor.name
    );
  }

  function createOutliner(
    color: THREE.Color,
    thickness: number,
    fillColor: THREE.Color,
    fillOpacity: number
  ) {
    const outliner = componentsValue.get(OBF.Outliner);
    outliner.world = world;
    outliner.color = color;
    outliner.thickness = thickness;
    outliner.fillColor = fillColor;
    outliner.fillOpacity = fillOpacity;

    outliner.enabled = true;
    return outliner;
  }

  const mainSelectOutliner = shallowRef<OBF.Outliner | undefined>(undefined);
  mainSelectOutliner.value = createOutliner(
    new THREE.Color("blue"),
    1,
    new THREE.Color("blue"),
    0.2
  );

  const drawMinSelection = (modelIdMap: OBC.ModelIdMap) => {
    mainSelectOutliner.value?.addItems(modelIdMap);
  };

  const clearMinSelection = () => {
    mainSelectOutliner.value?.clean();
  };

  const mainSelector = {
    draw: drawMinSelection,
    clear: clearMinSelection,
  };

  const clearHighlight = () => {
    if (!highlighter.value) return;
    highlighter.value!.clear(SELECT_HIGHLIGHTER_NAME);
  };
  highlighter.value.events[SELECT_HIGHLIGHTER_NAME].onHighlight.add((map) => {
    console.log("select highlighted:", map);
  });

  const createCustomHighlighter = (
    name: string,
    color: string | THREE.Color = "red",
    opacity: number = 1,
    transparent: boolean = false,
    renderedFaces: number = 0
  ) => {
    if (!highlighter.value) return;

    const colorObj = typeof color === "string" ? new THREE.Color(color) : color;

    highlighter.value.styles.set(name, {
      color: colorObj,
      opacity,
      transparent,
      renderedFaces,
    });

    highlighter.value.events[name].onHighlight.add((map) => {
      console.log(`Highlighted with ${name}`, map);
    });

    highlighter.value.events[name].onClear.add((map) => {
      console.log(`${name} highlighter cleared`, map);
    });
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
    if (!highlighter.value) return;
    if (!highlighter.value.styles.has(customHighlighterName)) {
      console.warn(
        `Custom highlighter "${customHighlighterName}" does not exist`
      );
      return;
    }

    const selection = highlighter.value.selection.select;
    if (OBC.ModelIdMapUtils.isEmpty(selection)) {
      console.warn("No items selected");
      return;
    }

    await highlighter.value.highlightByID(
      customHighlighterName,
      selection,
      false
    );

    // Если нужно очистить выделение после применения кастомного highlighter
    if (clearSelection) {
      await highlighter.value.clear(SELECT_HIGHLIGHTER_NAME);
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
    if (!highlighter.value) return;
    if (!highlighter.value.styles.has(customHighlighterName)) {
      console.warn(
        `Custom highlighter "${customHighlighterName}" does not exist`
      );
      return;
    }

    const modelIdMap = highlighter.value.selection.select;
    await highlighter.value.clear(
      customHighlighterName,
      onlySelected ? modelIdMap : undefined
    );

    // Очищаем выделение, если нужно
    if (clearSelection) {
      await highlighter.value.clear(SELECT_HIGHLIGHTER_NAME);
    }
  };

  highlighter.value.updateColors();

  return {
    highlighter,

    clearOutlines: clearHighlight,
    createCustomHighlighter,
    applyCustomHighlight,
    resetCustomHighlighter,

    mainSelector,
  };
};
