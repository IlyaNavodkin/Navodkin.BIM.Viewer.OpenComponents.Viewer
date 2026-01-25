import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as THREE from "three";

export interface IIfcSelectManager {
  selectElementsByLocalIds: (modelIdMap: OBC.ModelIdMap) => Promise<void>;
  clearSelection: () => void;
  fitCameraToElements: (modelIdMap: OBC.ModelIdMap) => Promise<void>;
}

export const useIfcSelectManager = (
  outliner: OBF.Outliner,
  world: OBC.SimpleWorld<
    OBC.SimpleScene,
    OBC.SimpleCamera,
    OBF.PostproductionRenderer
  >,
  boxer: OBC.BoundingBoxer
): IIfcSelectManager => {


  const selectElementsByLocalIds = async (modelIdMap: OBC.ModelIdMap) => {
    await outliner.addItems(modelIdMap)
    await fitCameraToElements(modelIdMap);
  };


  const clearSelection = () => {
    outliner.clean();
  };


  const fitCameraToElements = async (modelIdMap: OBC.ModelIdMap) => {
    try {
      boxer.list.clear();
      await boxer.addFromModelIdMap(modelIdMap);
      const box = boxer.get();
      boxer.list.clear();

      if (box) {
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);

        if (world.camera.hasCameraControls()) {
          await world.camera.controls.fitToSphere(sphere, true);
        }
      }
    } catch (error) {
      console.warn("Error fitting camera to selection:", error);
    }
  };

  return {
    selectElementsByLocalIds,
    clearSelection,
    fitCameraToElements
  };
};
