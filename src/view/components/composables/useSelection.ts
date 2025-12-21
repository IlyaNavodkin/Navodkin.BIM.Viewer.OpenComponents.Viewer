import { shallowRef } from "vue";
import * as OBC from "@thatopen/components";
import * as THREE from "three";
import * as FRAGS from "@thatopen/fragments";
import * as OBF from "@thatopen/components-front";

export const useSelection = (
  components: OBC.Components | undefined,
  world: OBC.World | undefined
) => {
  if (!components || !world)
    throw new Error("Components or world is not exists");

  // Получаем FragmentsManager для работы с данными элементов
  const fragments = components.get(OBC.FragmentsManager);

  const highlighter = shallowRef<OBF.Highlighter | undefined>(undefined);
  highlighter.value = components.get(OBF.Highlighter);

  // Настройка highlighter без изменения цвета (только outliner будет показывать выделение)
  highlighter.value.setup({
    world,
    autoUpdateFragments: true,
    selectMaterialDefinition: null, // Отключаем цвет выделения, используем только outliner
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

  const outliner = shallowRef<OBF.Outliner | undefined>(undefined);
  outliner.value = components.get(OBF.Outliner);
  outliner.value.world = world;
  outliner.value.color = new THREE.Color("red");
  outliner.value.thickness = 1;
  outliner.value.fillColor = new THREE.Color("red");
  outliner.value.fillOpacity = 0.2;

  // As a best practice, enable it after it has been configured
  outliner.value.enabled = true;

  const clearHighlight = () => {
    if (!highlighter.value) return;
    highlighter.value!.clear("select");
  };

  // Обработка события выделения элементов
  highlighter.value.events.select.onHighlight.add(async (modelIdMap) => {
    console.log("=== Элемент выделен ===");
    outliner.value!.addItems(modelIdMap);
    // Получаем данные выделенных элементов и их property sets
    for (const [modelId, localIds] of Object.entries(modelIdMap)) {
      const model = fragments.list.get(modelId);
      if (!model) continue;

      for (const localId of localIds) {
        // Получаем базовую информацию об элементе
        const itemsData = await model.getItemsData([localId], {
          attributesDefault: true,
        });

        if (itemsData && itemsData.length > 0) {
          const elementData = itemsData[0];
          console.log(`\n📦 Элемент (Local ID: ${localId}):`);
          console.log("  Основная информация:", {
            Name: elementData.Name,
            LocalId: localIds,
            Tag: elementData.Tag,
            ObjectType: elementData.ObjectType,
            Category: elementData._category,
          });
        }

        // Получаем Property Sets
        const [itemData] = await model.getItemsData([localId], {
          attributesDefault: true,
          relations: {
            IsDefinedBy: { attributes: true, relations: true },
            DefinesOcurrence: { attributes: false, relations: false },
          },
        });

        if (itemData && itemData.IsDefinedBy) {
          const psets = itemData.IsDefinedBy as FRAGS.ItemData[];
          const formattedPsets: Record<string, Record<string, any>> = {};

          for (const pset of psets) {
            const { Name: psetName, HasProperties } = pset;
            if (!("value" in psetName && Array.isArray(HasProperties)))
              continue;

            const props: Record<string, any> = {};
            for (const prop of HasProperties) {
              const { Name, NominalValue } = prop;
              if (!("value" in Name && "value" in NominalValue)) continue;
              const name = Name.value;
              const nominalValue = NominalValue.value;
              if (name && nominalValue !== undefined) {
                props[name] = nominalValue;
              }
            }
            formattedPsets[psetName.value] = props;
          }

          if (Object.keys(formattedPsets).length > 0) {
            console.log(`  Property Sets:`, formattedPsets);
          } else {
            console.log(`  Property Sets: нет данных`);
          }
        } else {
          console.log(`  Property Sets: нет данных`);
        }
      }
    }

    console.log("====================\n");
  });

  highlighter.value.events.select.onClear.add((modelIdMap) => {
    console.log("Selection was cleared", modelIdMap);
    outliner.value!.removeItems(modelIdMap);
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
      await highlighter.value.clear("select");
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
      await highlighter.value.clear("select");
    }
  };

  return {
    highlighter,
    clearOutlines: clearHighlight,
    createCustomHighlighter,
    applyCustomHighlight,
    resetCustomHighlighter,
  };
};
