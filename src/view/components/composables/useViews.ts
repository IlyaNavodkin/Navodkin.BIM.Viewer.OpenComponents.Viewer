import { computed, shallowRef } from "vue";
import * as OBC from "@thatopen/components";
import { FragmentsModel, LodMode } from "@thatopen/fragments";
import * as THREE from "three";
import * as FRAGS from "@thatopen/fragments";
import * as OBF from "@thatopen/components-front";

export const useViews = (
  components: OBC.Components | undefined,
  world: OBC.World | undefined
) => {
  if (!components || !world)
    throw new Error("Components or world is not exists");

  const views = shallowRef<OBC.Views | undefined>(undefined);
  views.value = components.get(OBC.Views);
  views.value.world = world;
  views.value.createFromIfcStoreys({ modelIds: [/^IfcBuildingStorey/] });

  views.value.list.forEach((view) => {
    view.helpersVisible = true;
    view.planesEnabled = true;
  });

  const viewsList = computed(() => {
    return views.value?.list.entries();
  });

  return { views, viewsList };
};
