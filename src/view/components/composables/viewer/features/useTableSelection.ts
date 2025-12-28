// import { ref, shallowRef, type Ref } from "vue";
// import * as OBC from "@thatopen/components";
// import * as OBF from "@thatopen/components-front";
// import { FragmentsModel } from "@thatopen/fragments";
// import * as THREE from "three";

// export interface TableSelectionState {
//   selectedTableId: number | null;
//   markerId: string | null;
//   markerApp: any | null;
//   markerElement: HTMLElement | null;
// }

// /**
//  * Фича для управления выбором столов
//  * Отвечает за выбор столов с маркерами и highlight
//  */
// export const useTableSelection = (
//   model: Ref<FragmentsModel | undefined>,
//   currentWord: Ref<
//     | OBC.SimpleWorld<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>
//     | undefined
//   >,
//   components: Ref<OBC.Components | undefined>,
//   markers: {
//     createMarkerInPoint: (
//       htmlElement: HTMLElement,
//       point: THREE.Vector3
//     ) => string | null | undefined;
//     removeMarker: (markerId: string) => void;
//   },
//   selection: {
//     highlighter: Ref<OBF.Highlighter | undefined>;
//     clearOutlines: () => void;
//     highlightActivePlacement: (modelIdMap: OBC.ModelIdMap) => void;
//   }
// ) => {
//   const selectedTableId = ref<number | null>(null);
//   const markerId = ref<string | null>(null);
//   const markerApp = shallowRef<any | null>(null);
//   const markerElement = shallowRef<HTMLElement | null>(null);

//   /**
//    * Выбирает стол и создает маркер с highlight
//    */
//   const selectTable = async (localId: number) => {
//     if (!model.value || !currentWord.value || !components.value) {
//       console.warn("Модель, камера или components не инициализированы");
//       return;
//     }

//     // Очищаем предыдущий выбор, если есть
//     await clearSelection();

//     // Устанавливаем новый выбранный стол
//     selectedTableId.value = localId;

//     const modelIdMap: OBC.ModelIdMap = {
//       [model.value.modelId]: new Set([localId]),
//     };

//     // Приближаем камеру к элементу
//     currentWord.value.camera.fitToItems(modelIdMap);

//     // Выделяем элемент (красным через mainSelectOutliner)
//     // mainSelectOutliner автоматически добавится через обработчик события onHighlight
//     selection.highlightActivePlacement(modelIdMap);

//     // Создаем маркер
//     // const htmlElement = document.createElement("div");
//     // markerElement.value = htmlElement;

//     // Создаем Vue компонент для маркера
//     // const app = createApp(TableMarker, { localId });
//     // app.mount(htmlElement);
//     // markerApp.value = app;

//     // // Получаем центр элемента для размещения маркера
//     // const boxer = components.value.get(OBC.BoundingBoxer);
//     // const point = await boxer?.getCenter(modelIdMap);

//     // if (point) {
//     //   const id = markers.createMarkerInPoint(htmlElement, point);
//     //   if (id) {
//     //     markerId.value = id;
//     //   }
//     // }
//   };

//   /**
//    * Очищает выбор стола: удаляет маркер и highlight
//    */
//   const clearSelection = async () => {
//     // Очищаем highlight
//     selection.clearOutlines();

//     // Удаляем маркер
//     if (markerId.value) {
//       markers.removeMarker(markerId.value);
//       markerId.value = null;
//     }

//     // Размонтируем Vue приложение маркера
//     if (markerApp.value) {
//       try {
//         markerApp.value.unmount();
//       } catch (error) {
//         console.warn("Ошибка при размонтировании маркера:", error);
//       }
//       markerApp.value = null;
//     }

//     // Очищаем ссылку на элемент
//     markerElement.value = null;

//     // Сбрасываем выбранный стол
//     selectedTableId.value = null;
//   };

//   /**
//    * Проверяет, выбран ли стол
//    */
//   const isTableSelected = (localId: number): boolean => {
//     return selectedTableId.value === localId;
//   };

//   /**
//    * Проверяет, есть ли активный выбор
//    */
//   const hasSelection = (): boolean => {
//     return selectedTableId.value !== null;
//   };

//   return {
//     selectedTableId,
//     selectTable,
//     clearSelection,
//     isTableSelected,
//     hasSelection,
//   };
// };
