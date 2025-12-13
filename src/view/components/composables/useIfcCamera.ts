import { SimpleCamera } from "@thatopen/components";

export const useIfcCamera = (camera: SimpleCamera) => {
  const DEFAULT_CAMERA_POSITION = { x: 10, y: 10, z: 10 };
  const DEFAULT_CAMERA_TARGET = { x: 0, y: 0, z: 0 };

  const resetCamera = async () => {
    if (!camera) throw new Error("Camera not found - set camera first");

    await camera.controls.setLookAt(
      DEFAULT_CAMERA_POSITION.x,
      DEFAULT_CAMERA_POSITION.y,
      DEFAULT_CAMERA_POSITION.z,
      DEFAULT_CAMERA_TARGET.x,
      DEFAULT_CAMERA_TARGET.y,
      DEFAULT_CAMERA_TARGET.z,
      true
    );
    return camera;
  };

  let lastMiddleClickTime = 0;
  const DOUBLE_CLICK_DELAY = 300;

  const handleMiddleMouseClick = async (event: MouseEvent) => {
    if (event.button === 1) {
      event.preventDefault();

      const currentTime = Date.now();

      const timeSinceLastClick = currentTime - lastMiddleClickTime;

      if (timeSinceLastClick < DOUBLE_CLICK_DELAY) {
        await resetCamera();
        lastMiddleClickTime = 0;
      } else {
        lastMiddleClickTime = currentTime;
      }
    }
  };
  return {
    resetCamera,
    handleMiddleMouseClick,
  };
};
