import { shallowRef, type Ref } from "vue";
import * as OBC from "@thatopen/components";
import * as THREE from "three";
import * as OBF from "@thatopen/components-front";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { useViewerCoreStore } from "@/stores/useViewerCoreStore";

/**
 * Фича для клиппинга
 * Отвечает за создание и управление плоскостями клиппинга
 */
export const useClipStyler = () => {
  const store = useViewerCoreStore();

  const init = () => {
    if (!store.core.components.value || !store.core.currentWord.value) {
      throw new Error("Components и currentWord должны быть инициализированы");
    }

    store.features.clip.clipper.value = store.core.components.value.get(
      OBC.Clipper
    );
    store.features.clip.clipper.value.enabled = true;
    // Скрываем визуальные элементы клиппера (плоскости и хелперы)
    store.features.clip.clipper.value.visible = false;

    store.features.clip.clipStyler.value = store.core.components.value.get(
      OBF.ClipStyler
    );
    store.features.clip.clipStyler.value.world = store.core.currentWord.value;

    // Инициализация стиля с черным заполнением один раз внутри композабла
    if (store.features.clip.clipStyler.value) {
      store.features.clip.clipStyler.value.styles.set("Black", {
        linesMaterial: new LineMaterial({ color: "black", linewidth: 2 }),
        fillsMaterial: new THREE.MeshBasicMaterial({
          color: "white",
          side: 2, // THREE.DoubleSide
        }),
      });

      // Стиль только с черным заполнением (без линий) - для использования по умолчанию
      store.features.clip.clipStyler.value.styles.set("BlackFill", {
        fillsMaterial: new THREE.MeshBasicMaterial({
          color: "white",
          side: 2, // THREE.DoubleSide
        }),
        linesMaterial: new LineMaterial({ color: "black", linewidth: 2 }),
      });
    }

    // Критически важно: связываем плоскости клиппера со стилями заполнения
    // Без этого заполнение не будет создаваться!
    if (
      store.features.clip.clipper.value &&
      store.features.clip.clipStyler.value
    ) {
      // Скрываем каждую создаваемую плоскость и её хелпер
      store.features.clip.clipper.value.onAfterCreate.add((plane: any) => {
        // Скрываем визуальное представление плоскости
        plane.visible = false;
      });

      store.features.clip.clipper.value.list.onItemSet.add(
        ({ key, value: plane }: { key: any; value: any }) => {
          // Создаем заполнение для всех элементов при создании новой плоскости клиппера
          store.features.clip.clipStyler.value!.createFromClipping(key, {
            items: { All: { style: "BlackFill" } },
          });

          // Дополнительно скрываем плоскость (на случай, если onAfterCreate не сработал)
          if (plane && plane.visible !== undefined) {
            plane.visible = false;
          }
        }
      );
    }
  };

  const dispose = () => {
    if (store.features.clip.clipper.value) {
      store.features.clip.clipper.value.dispose();
    }
    if (store.features.clip.clipStyler.value) {
      store.features.clip.clipStyler.value.dispose();
    }
  };

  const clearAll = () => {
    if (!store.features.clip.clipper.value) return;

    store.features.clip.clipper.value.deleteAll();
  };

  return {
    clearAll,
    init,
    dispose,
  };
};
