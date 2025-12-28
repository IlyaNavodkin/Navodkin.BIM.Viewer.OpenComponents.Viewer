// import { shallowRef, type Ref } from "vue";
// import * as OBC from "@thatopen/components";
// import * as THREE from "three";
// import * as OBF from "@thatopen/components-front";

// /**
//  * Фича для hover эффектов
//  * Отвечает за визуальную обратную связь при наведении на элементы
//  */
// export const useHover = (
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

//   const hoverer = shallowRef<OBF.Hoverer | undefined>(undefined);
//   hoverer.value = componentsValue.get(OBF.Hoverer);
//   hoverer.value.world = world;
//   hoverer.value.enabled = true;
//   hoverer.value.animation = true;
//   hoverer.value.material = new THREE.MeshBasicMaterial({
//     color: 0x6528d7,
//     transparent: true,
//     opacity: 0.5,
//     depthTest: false,
//   });

//   return hoverer;
// };
