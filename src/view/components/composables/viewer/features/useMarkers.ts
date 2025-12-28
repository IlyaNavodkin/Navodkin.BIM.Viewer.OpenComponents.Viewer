// import { shallowRef, type Ref } from "vue";
// import * as OBC from "@thatopen/components";
// import * as THREE from "three";
// import * as OBF from "@thatopen/components-front";

// /**
//  * Фича для маркеров
//  * Отвечает за создание и управление маркерами в 3D пространстве
//  */
// export const useMarkers = (
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

//   const marker = shallowRef<OBF.Marker | undefined>(undefined);

//   marker.value = componentsValue.get(OBF.Marker);
//   marker.value.threshold = 1;
//   marker.value.enabled = true;

//   const createMarkerInPoint = (
//     htmlElement: HTMLElement,
//     point: THREE.Vector3
//   ) => {
//     if (!marker.value) return;

//     const newMarkerId = marker.value.create(world, htmlElement, point);

//     return newMarkerId;
//   };

//   const removeMarker = (markerId: string) => {
//     if (!marker.value) return;
//     marker.value.delete(markerId);
//   };
//   return { createMarkerInPoint, removeMarker };
// };
