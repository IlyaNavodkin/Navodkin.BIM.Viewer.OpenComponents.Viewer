import { ref, shallowRef, watch, type ShallowRef } from "vue";
import { createApp, type App } from "vue";
import * as OBC from "@thatopen/components";
import { FragmentsModel } from "@thatopen/fragments";
import TableMarker from "../viewport/TableMarker.vue";
import type { useMarkers } from "./useMarkers";
import type { useSelection } from "./useSelection";

export interface TableSelectionState {
  selectedTableId: number | null;
  markerId: string | null;
  markerApp: App | null;
  markerElement: HTMLElement | null;
}

/**
 * Composable для управления выбором столов с маркерами и highlight
 */
export const useTableSelection = (
  currentModel: ShallowRef<FragmentsModel | undefined>,
  currentWord: ShallowRef<
    | OBC.SimpleWorld<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>
    | undefined
  >,
  components: ShallowRef<OBC.Components | undefined>,
  markersState: ShallowRef<ReturnType<typeof useMarkers> | undefined>,
  selectionState: ShallowRef<ReturnType<typeof useSelection> | undefined>
) => {
  const selectedTableId = ref<number | null>(null);
  const markerId = ref<string | null>(null);
  const markerApp = shallowRef<App | null>(null);
  const markerElement = shallowRef<HTMLElement | null>(null);

  /**
   * Выбирает стол и создает маркер с highlight
   */
  const selectTable = async (localId: number) => {
    if (
      !currentModel.value ||
      !currentWord.value ||
      !components.value ||
      !markersState.value ||
      !selectionState.value
    ) {
      console.warn(
        "Модель, камера, components, markersState или selectionState не инициализированы"
      );
      return;
    }

    // Очищаем предыдущий выбор, если есть
    await clearSelection();

    // Устанавливаем новый выбранный стол
    selectedTableId.value = localId;

    const modelIdMap: OBC.ModelIdMap = {
      [currentModel.value.modelId]: new Set([localId]),
    };

    // Приближаем камеру к элементу
    currentWord.value.camera.fitToItems(modelIdMap);

    // Выделяем элемент
    selectionState.value.highlighter.value?.highlightByID(
      "select",
      modelIdMap,
      false
    );

    // Создаем маркер
    // const htmlElement = document.createElement("div");
    // markerElement.value = htmlElement;

    // Создаем Vue компонент для маркера
    // const app = createApp(TableMarker, { localId });
    // app.mount(htmlElement);
    // markerApp.value = app;

    // // Получаем центр элемента для размещения маркера
    // const boxer = components.value.get(OBC.BoundingBoxer);
    // const point = await boxer?.getCenter(modelIdMap);

    // if (point) {
    //   const id = markersState.value.createMarkerInPoint(htmlElement, point);
    //   if (id) {
    //     markerId.value = id;
    //   }
    // }
  };

  /**
   * Очищает выбор стола: удаляет маркер и highlight
   */
  const clearSelection = async () => {
    // Очищаем highlight
    if (selectionState.value) {
      selectionState.value.clearOutlines();
    }

    // Удаляем маркер
    if (markerId.value && markersState.value) {
      markersState.value.removeMarker(markerId.value);
      markerId.value = null;
    }

    // Размонтируем Vue приложение маркера
    if (markerApp.value) {
      try {
        markerApp.value.unmount();
      } catch (error) {
        console.warn("Ошибка при размонтировании маркера:", error);
      }
      markerApp.value = null;
    }

    // Очищаем ссылку на элемент
    markerElement.value = null;

    // Сбрасываем выбранный стол
    selectedTableId.value = null;
  };

  /**
   * Проверяет, выбран ли стол
   */
  const isTableSelected = (localId: number): boolean => {
    return selectedTableId.value === localId;
  };

  /**
   * Проверяет, есть ли активный выбор
   */
  const hasSelection = (): boolean => {
    return selectedTableId.value !== null;
  };

  return {
    selectedTableId,
    selectTable,
    clearSelection,
    isTableSelected,
    hasSelection,
  };
};
