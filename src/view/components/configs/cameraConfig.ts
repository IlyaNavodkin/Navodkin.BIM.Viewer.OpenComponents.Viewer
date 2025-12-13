import * as THREE from "three";
import * as OBC from "@thatopen/components";

/**
 * Конфигурация параметров камеры для Three.js
 * Эти параметры определяют видимую область камеры (frustum)
 * и влияют на БАЗОВЫЙ frustum culling Three.js
 */
export interface CameraConfig {
  /** Максимальная дальность видимости (по умолчанию ~1000) */
  far: number;
  /** Минимальная дальность видимости (по умолчанию ~0.1) */
  near: number;
  /** Поле зрения в градусах (по умолчанию ~50) */
  fov: number;
}

/**
 * Стандартная конфигурация камеры
 */
export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  // far - максимальная дальность видимости
  // Увеличение этого значения позволяет видеть объекты на большем расстоянии
  // ВАЖНО: слишком большое значение может снизить точность глубины (z-fighting)
  far: 1000,

  // near - минимальная дальность видимости
  // Уменьшение этого значения позволяет видеть объекты ближе к камере
  // ВАЖНО: слишком маленькое значение может вызвать проблемы с точностью
  near: 0.5,

  // fov - поле зрения в градусах
  // Большее значение = более широкий угол обзора (как широкоугольный объектив)
  // Меньшее значение = более узкий угол обзора (как телеобъектив)
  fov: 50,
};

/**
 * Применяет конфигурацию камеры к Three.js камере
 * @param camera - Three.js камера (PerspectiveCamera или OrthographicCamera)
 * @param config - конфигурация камеры (опционально, используется DEFAULT_CAMERA_CONFIG)
 */
export const configureCamera = (
  camera: THREE.Camera,
  config: CameraConfig = DEFAULT_CAMERA_CONFIG
): void => {
  const cameraThree = camera as THREE.PerspectiveCamera;

  if (cameraThree instanceof THREE.PerspectiveCamera) {
    cameraThree.far = config.far;
    cameraThree.near = config.near;
    cameraThree.fov = config.fov;

    // ВАЖНО: после изменения параметров камеры нужно обновить матрицу проекции
    cameraThree.updateProjectionMatrix();
  }
};

/**
 * Стандартная позиция камеры для начальной настройки
 */
export const DEFAULT_CAMERA_POSITION = {
  position: { x: 10, y: 10, z: 10 },
  target: { x: 0, y: 0, z: 0 },
};
