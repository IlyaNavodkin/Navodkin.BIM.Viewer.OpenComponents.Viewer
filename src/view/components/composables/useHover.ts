import { computed, shallowRef } from "vue";
import * as OBC from "@thatopen/components";
import { FragmentsModel, LodMode } from "@thatopen/fragments";
import * as THREE from "three";
import * as FRAGS from "@thatopen/fragments";
import * as OBF from "@thatopen/components-front";

export const useHover = (
  components: OBC.Components | undefined,
  world: OBC.World | undefined
) => {
  if (!components || !world)
    throw new Error("Components or world is not exists");

  const hoverer = shallowRef<OBF.Hoverer | undefined>(undefined);
  hoverer.value = components.get(OBF.Hoverer);
  hoverer.value.world = world;
  hoverer.value.enabled = true;
  hoverer.value.animation = true;
  hoverer.value.material = new THREE.MeshBasicMaterial({
    color: 0x6528d7,
    transparent: true,
    opacity: 0.5,
    depthTest: false,
  });

  return hoverer;
};
