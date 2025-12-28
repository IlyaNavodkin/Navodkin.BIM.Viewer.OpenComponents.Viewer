// import { computed, ref, shallowRef, type Ref } from "vue";
// import * as OBC from "@thatopen/components";
// import * as THREE from "three";
// import { LevelsViewData } from "../data/useDataAccess";

// /**
//  * Фича для управления видами
//  * Отвечает за создание и управление видами (views) модели
//  */
// export const useViews = (
//   components: Ref<OBC.Components | undefined>,
//   currentWord: Ref<
//     | OBC.SimpleWorld<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>
//     | undefined
//   >
// ) => {
//   if (!components.value || !currentWord.value) {
//     throw new Error("Components и currentWord должны быть инициализированы");
//   }

//   const componentsValue = components.value;
//   const world = currentWord.value;

//   const views = shallowRef<OBC.Views | undefined>(undefined);
//   views.value = componentsValue.get(OBC.Views);
//   views.value.world = world;

//   // Реактивный триггер для принудительного обновления computed при изменении views.list
//   const viewsUpdateTrigger = ref(0);

//   // Подписываемся на события добавления/удаления views для реактивного обновления
//   // Важно: подписки должны быть ДО создания views, чтобы не пропустить события
//   views.value.list.onItemSet.add(() => {
//     console.log("View added - size:", views.value?.list?.size);
//     viewsUpdateTrigger.value++;
//   });

//   views.value.list.onItemDeleted.add(() => {
//     console.log("View deleted - size:", views.value?.list?.size);
//     viewsUpdateTrigger.value++;
//   });

//   views.value.list.onItemUpdated.add(() => {
//     console.log("View updated - size:", views.value?.list?.size);
//     viewsUpdateTrigger.value++;
//   });

//   // Создаем views из IFC storeys (если есть)
//   views.value.createFromIfcStoreys({ modelIds: [/^IfcBuildingStorey/] });

//   views.value.list.forEach((view) => {
//     view.helpersVisible = true;
//     view.planesEnabled = true;
//   });

//   const viewsList = computed(() => {
//     // Читаем триггер для создания зависимости
//     viewsUpdateTrigger.value;

//     if (!views.value) return [];
//     return Array.from(views.value.list.entries());
//   });

//   const createViewsFromLevels = async (levelsData: LevelsViewData[]) => {
//     const orderedLevels = levelsData.sort(
//       (a: LevelsViewData, b: LevelsViewData) => {
//         return a.elevation - b.elevation;
//       }
//     );

//     for (let index = 0; index < orderedLevels.length; index++) {
//       const item = orderedLevels[index];

//       const normal = new THREE.Vector3(0, -1, 0);
//       const elevationValue = item.elevation;
//       const point = new THREE.Vector3(0, elevationValue, 0);
//       const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
//         normal,
//         point
//       );

//       const view = views.value?.createFromPlane(plane, { id: item.name });

//       if (!view) throw new Error("View is not exists");

//       const isLastItem = index === orderedLevels.length - 1;
//       if (isLastItem) {
//         const previousItem = orderedLevels[index - 1];
//         const previousElevation = previousItem.elevation;
//         const distanceLast = elevationValue + 10;

//         view.distance = distanceLast;
//         view.range = previousElevation + distanceLast + 10;

//         console.log(
//           `[ПОСЛЕДНИЙ ЭТАЖ #${index}] Текущая высота: ${elevationValue}, Предыдущая высота: ${previousElevation}, Дистанция: ${view.distance}`
//         );
//       } else {
//         const nextItem = orderedLevels[index + 1];
//         const nextElevation = nextItem.elevation;

//         view.distance = elevationValue + (nextElevation - elevationValue) / 2;
//         view.range = (nextElevation - elevationValue) / 2 + 10;
//         console.log(
//           `[ЭТАЖ #${index}] Текущая высота: ${elevationValue}, Следующая высота: ${nextElevation}, Дистанция: ${view.distance}`
//         );
//       }

//       view.update();
//     }

//     // Принудительно обновляем триггер после создания всех views
//     viewsUpdateTrigger.value++;
//     console.log(
//       `Views created. Total views: ${views.value?.list.size}, viewsList length: ${viewsList.value.length}`
//     );
//   };

//   return { views, viewsList, createViewsFromLevels };
// };
