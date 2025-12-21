import { shallowRef } from "vue";
import * as OBC from "@thatopen/components";
import * as THREE from "three";
import * as OBF from "@thatopen/components-front";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

export const useClipStyler = (
  components: OBC.Components | undefined,
  world: OBC.World | undefined
) => {
  if (!components || !world)
    throw new Error("Components or world is not exists");

  const clipper = shallowRef<OBC.Clipper | undefined>(undefined);
  clipper.value = components.get(OBC.Clipper);
  clipper.value.enabled = true;
  // Скрываем визуальные элементы клиппера (плоскости и хелперы)
  clipper.value.visible = false;

  const clipStyler = shallowRef<OBF.ClipStyler | undefined>(undefined);
  clipStyler.value = components.get(OBF.ClipStyler);
  clipStyler.value.world = world;

  // Инициализация стиля с черным заполнением один раз внутри композабла
  if (clipStyler.value) {
    clipStyler.value.styles.set("Black", {
      linesMaterial: new LineMaterial({ color: "black", linewidth: 2 }),
      fillsMaterial: new THREE.MeshBasicMaterial({
        color: "white",
        side: 2, // THREE.DoubleSide
      }),
    });

    // Стиль только с черным заполнением (без линий) - для использования по умолчанию
    clipStyler.value.styles.set("BlackFill", {
      fillsMaterial: new THREE.MeshBasicMaterial({
        color: "white",
        side: 2, // THREE.DoubleSide
      }),
      linesMaterial: new LineMaterial({ color: "black", linewidth: 2 }),
    });
  }

  // Критически важно: связываем плоскости клиппера со стилями заполнения
  // Без этого заполнение не будет создаваться!
  if (clipper.value && clipStyler.value) {
    // Скрываем каждую создаваемую плоскость и её хелпер
    clipper.value.onAfterCreate.add((plane) => {
      // Скрываем визуальное представление плоскости
      plane.visible = false;
    });

    clipper.value.list.onItemSet.add(({ key, value: plane }) => {
      // Создаем заполнение для всех элементов при создании новой плоскости клиппера
      clipStyler.value!.createFromClipping(key, {
        items: { All: { style: "BlackFill" } },
      });

      // Дополнительно скрываем плоскость (на случай, если onAfterCreate не сработал)
      if (plane && plane.visible !== undefined) {
        plane.visible = false;
      }
    });
  }

  // Минимальный метод для очистки клипов (используется в useViewer)
  const clearAll = () => {
    if (!clipper.value) return;

    clipper.value.deleteAll();
  };

  return {
    clipStyler,
    clipper,
    clearAll,
  };
};
