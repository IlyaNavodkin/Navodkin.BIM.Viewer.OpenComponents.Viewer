// import { ref, shallowRef, type Ref } from "vue";
// import { FragmentsModel } from "@thatopen/fragments";
// import * as OBC from "@thatopen/components";
// import * as THREE from "three";
// import * as OBF from "@thatopen/components-front";

// /**
//  * Фича для X-Ray эффекта
//  * Выделяет все невыбранные элементы серым цветом с пониженной прозрачностью
//  */
// export const useXRay = (highlighter: Ref<OBF.Highlighter | undefined>) => {
//   const isEnabled = ref(false);
//   const currentModel = shallowRef<FragmentsModel | undefined>(undefined);
//   const currentExcludeIds = ref<number[]>([]);
//   const HIGHLIGHT_GROUP_NAME = "xray";

//   /**
//    * Инициализирует кастомный highlighter для X-Ray эффекта
//    */
//   const initXRayHighlighter = () => {
//     if (!highlighter.value) {
//       console.warn("Highlighter не инициализирован для X-Ray");
//       return;
//     }

//     const highlighterValue = highlighter.value;

//     // Создаем кастомный highlighter, если его еще нет
//     if (!highlighterValue.styles.has(HIGHLIGHT_GROUP_NAME)) {
//       highlighterValue.styles.set(HIGHLIGHT_GROUP_NAME, {
//         color: new THREE.Color("gray"),
//         opacity: 0.5,
//         transparent: true,
//         renderedFaces: 0,
//       });

//       highlighterValue.events[HIGHLIGHT_GROUP_NAME].onHighlight.add((map) => {
//         console.log(`X-Ray эффект применен: ${HIGHLIGHT_GROUP_NAME}`, map);
//       });

//       highlighterValue.events[HIGHLIGHT_GROUP_NAME].onClear.add((map) => {
//         console.log(`X-Ray эффект очищен: ${HIGHLIGHT_GROUP_NAME}`, map);
//       });
//     }
//   };

//   /**
//    * Получает все элементы модели
//    * @param model - модель
//    * @returns Массив всех localId элементов
//    */
//   const getAllModelItems = async (model: FragmentsModel): Promise<number[]> => {
//     try {
//       // Получаем все элементы через широкий паттерн категорий
//       // Используем паттерн, который соответствует всем категориям IFC
//       const allItems = await model.getItemsOfCategories([/IFC/]);
//       const allIds = Object.values(allItems).flat();

//       // Если не получилось, пробуем альтернативный способ
//       if (allIds.length === 0) {
//         // Получаем элементы через популярные категории
//         const commonCategories = [
//           /IFCWALL/,
//           /IFCSLAB/,
//           /IFCCOLUMN/,
//           /IFCBEAM/,
//           /IFCDOOR/,
//           /IFCWINDOW/,
//           /IFCFURNISHING/,
//           /IFCSPACE/,
//           /IFCBUILDING/,
//           /IFCBUILDINGSTOREY/,
//         ];
//         const itemsByCategory = await model.getItemsOfCategories(
//           commonCategories
//         );
//         const idsByCategory = Object.values(itemsByCategory).flat();
//         console.log(
//           `Получено элементов через категории: ${idsByCategory.length}`
//         );
//         return idsByCategory;
//       }

//       console.log(`Получено элементов через /IFC/: ${allIds.length}`);
//       return allIds;
//     } catch (error) {
//       console.error("Ошибка при получении всех элементов модели:", error);
//       return [];
//     }
//   };

//   /**
//    * Применяет X-Ray эффект к элементам, которые не в списке исключений
//    * @param excludeIds - массив ID элементов, которые НЕ нужно скрывать (делать серыми)
//    */
//   const applyXRay = async (excludeIds: number[] = []) => {
//     if (!highlighter.value || !currentModel.value) {
//       return;
//     }

//     // Сохраняем текущие excludeIds
//     currentExcludeIds.value = excludeIds;

//     const highlighterValue = highlighter.value;
//     const model = currentModel.value;

//     // Инициализируем highlighter, если нужно
//     initXRayHighlighter();

//     // Очищаем предыдущее выделение
//     await highlighterValue.clear(HIGHLIGHT_GROUP_NAME);

//     // Если X-Ray не включен, выходим
//     if (!isEnabled.value) {
//       return;
//     }

//     // Создаем Set из ID элементов, которые не нужно скрывать
//     const excludeIdsSet = new Set(excludeIds.map((id) => Number(id)));
//     console.log(
//       "X-Ray excludeIds:",
//       excludeIds,
//       "Set:",
//       Array.from(excludeIdsSet)
//     );

//     // Получаем все элементы модели
//     const allItems = await getAllModelItems(model);
//     console.log(`Всего элементов в модели: ${allItems.length}`);

//     // Проверяем, что excludeIds действительно в модели
//     const excludedInModel = allItems.filter((id) =>
//       excludeIdsSet.has(Number(id))
//     );
//     console.log(
//       `Проверка: исключенные элементы найдены в модели: ${excludedInModel.length} из ${excludeIds.length}`,
//       "Найденные ID:",
//       excludedInModel.slice(0, 10)
//     );

//     // Вычисляем элементы, которые нужно скрыть (все кроме excludeIds)
//     const itemsToHide = allItems.filter((id) => !excludeIdsSet.has(Number(id)));
//     console.log(
//       `Элементов для скрытия: ${itemsToHide.length}, исключено: ${excludeIds.length}`
//     );

//     // Дополнительная проверка: убеждаемся, что excludeIds не попали в itemsToHide
//     const mistakenlyIncluded = itemsToHide.filter((id) =>
//       excludeIdsSet.has(Number(id))
//     );
//     if (mistakenlyIncluded.length > 0) {
//       console.warn(
//         `ОШИБКА: ${mistakenlyIncluded.length} исключенных элементов попали в список для скрытия!`,
//         mistakenlyIncluded
//       );
//     }

//     if (itemsToHide.length === 0) {
//       console.log("Нет элементов для X-Ray эффекта");
//       return;
//     }

//     // Создаем ModelIdMap для highlight элементов, которые нужно скрыть
//     const modelIdMap: OBC.ModelIdMap = {
//       [model.modelId]: new Set(itemsToHide),
//     };

//     // Применяем highlight
//     await highlighterValue.highlightByID(
//       HIGHLIGHT_GROUP_NAME,
//       modelIdMap,
//       false
//     );
//     console.log(
//       `Применен X-Ray эффект к ${itemsToHide.length} элементам (исключено: ${excludeIds.length})`
//     );
//   };

//   /**
//    * Очищает X-Ray эффект
//    */
//   const clearXRay = async () => {
//     if (!highlighter.value) {
//       return;
//     }

//     await highlighter.value.clear(HIGHLIGHT_GROUP_NAME);
//   };

//   /**
//    * Включает или выключает X-Ray эффект
//    * @param enabled - включить или выключить
//    * @param excludeIds - массив ID элементов, которые НЕ нужно скрывать (опционально)
//    */
//   const setEnabled = async (enabled: boolean, excludeIds: number[] = []) => {
//     // Сохраняем excludeIds перед изменением isEnabled
//     if (excludeIds.length > 0) {
//       currentExcludeIds.value = excludeIds;
//     }

//     isEnabled.value = enabled;

//     if (enabled) {
//       // Используем переданные excludeIds или текущие сохраненные
//       const idsToUse =
//         excludeIds.length > 0 ? excludeIds : currentExcludeIds.value;
//       await applyXRay(idsToUse);
//     } else {
//       await clearXRay();
//     }
//   };

//   /**
//    * Переключает X-Ray эффект
//    * @param excludeIds - массив ID элементов, которые НЕ нужно скрывать (опционально)
//    */
//   const toggle = async (excludeIds: number[] = []) => {
//     await setEnabled(!isEnabled.value, excludeIds);
//   };

//   /**
//    * Инициализирует X-Ray для модели
//    * @param model - модель
//    */
//   const init = async (model: FragmentsModel) => {
//     currentModel.value = model;

//     // Если X-Ray уже включен, применяем эффект с текущими excludeIds
//     if (isEnabled.value) {
//       await applyXRay(currentExcludeIds.value);
//     }
//   };

//   // Не используем watch на isEnabled, так как setEnabled и toggle уже вызывают applyXRay
//   // с правильными excludeIds. Watch конфликтовал бы и перезаписывал excludeIds.

//   return {
//     // Реактивные состояния
//     isEnabled,

//     // Методы
//     setEnabled,
//     toggle,
//     applyXRay, // Метод принимает excludeIds - массив ID элементов, которые НЕ нужно скрывать
//     clearXRay,
//     init,
//   };
// };
