import { computed, ref, shallowRef } from "vue";
import * as OBC from "@thatopen/components";
import * as THREE from "three";
import { LevelsViewData } from "./useDataAccess";
import * as OBF from "@thatopen/components-front";

export const useMarkers = (
  components: OBC.Components | undefined,
  world: OBC.World | undefined
) => {
  if (!components || !world)
    throw new Error("Components or world is not exists");

  const marker = shallowRef<OBF.Marker | undefined>(undefined);

  marker.value = components.get(OBF.Marker);
  marker.value.threshold = 1;
  marker.value.enabled = true;

  const createMarkerInPoint = (
    htmlElement: HTMLElement,
    point: THREE.Vector3
  ) => {
    if (!marker.value) return;

    const newMarkerId = marker.value.create(world, htmlElement, point);

    return newMarkerId;
  };

  const removeMarker = (markerId: string) => {
    if (!marker.value) return;
    marker.value.delete(markerId);
  };
  return { createMarkerInPoint, marker, removeMarker };
};
