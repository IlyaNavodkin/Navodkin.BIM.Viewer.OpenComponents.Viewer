import { ref, type Ref } from "vue";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as THREE from "three";
import { AirplaneComponent } from "../ifc/components/AirplaneComponent";

export type AirplaneConfig = {
  radius: number;
  centerY: number;
  speed: number;
  initialAngle: number;
};

export interface IAirplaneManager {
  airplanes: Ref<AirplaneComponent[]>;
  isLoading: Ref<boolean>;
  createAirplane: (config: AirplaneConfig) => AirplaneComponent;
  removeAirplane: (uuid: string) => boolean;
  removeAirplaneByIndex: (index: number) => boolean;
  removeAllAirplanes: () => void;
  getAirplaneByIndex: (index: number) => AirplaneComponent | null;
  getAirplaneByUuid: (uuid: string) => AirplaneComponent | null;
  getAirplanePosition: (index: number) => THREE.Vector3 | null;
  getAllAirplanePositions: () => THREE.Vector3[];
  toggleAirplane: (index: number, enabled: boolean) => void;
  updateAirplaneParams: (
    index: number,
    radius?: number,
    centerY?: number,
    speed?: number
  ) => void;
  updateAllAirplanesParams: (
    radius?: number,
    centerY?: number,
    speed?: number
  ) => void;
  dispose: () => void;
}

export const useAirplaneManager = (
  components: OBC.Components,
  world: OBC.SimpleWorld<
    OBC.SimpleScene,
    OBC.SimpleCamera,
    OBF.PostproductionRenderer
  >
): IAirplaneManager => {
  const airplanes = ref<AirplaneComponent[]>([]);
  const isLoading = ref(false);

  let updateHandler: (() => void) | null = null;
  let lastTime = performance.now();

  // Инициализация системы обновления
  const initializeUpdateLoop = () => {
    if (updateHandler) return; // Уже инициализировано

    updateHandler = () => {
      const currentTime = performance.now();
      const delta = currentTime - lastTime;
      lastTime = currentTime;

      // Обновляем все самолетики
      airplanes.value.forEach((airplane) => {
        if (airplane.enabled) {
          airplane.update(delta);
        }
      });
    };

    world.renderer!.onBeforeUpdate.add(updateHandler);
  };

  // Создание нового самолетика
  const createAirplane = (config: AirplaneConfig): AirplaneComponent => {
    isLoading.value = true;

    try {
      const airplane = new AirplaneComponent(components);

      // Добавляем самолетик в сцену
      airplane.addToScene(world);

      // Настраиваем параметры полета
      airplane.setFlightParams(config.radius, config.centerY, config.speed);

      // Устанавливаем начальный угол
      airplane.setInitialAngle(config.initialAngle);

      // Добавляем в массив
      airplanes.value.push(airplane);

      // Инициализируем цикл обновления, если еще не инициализирован
      if (airplanes.value.length === 1) {
        initializeUpdateLoop();
      }

      return airplane;
    } finally {
      isLoading.value = false;
    }
  };

  // Удаление самолетика по UUID
  const removeAirplane = (uuid: string): boolean => {
    const index = airplanes.value.findIndex(
      (airplane) => airplane.uuid === uuid
    );
    if (index === -1) return false;

    return removeAirplaneByIndex(index);
  };

  // Удаление самолетика по индексу
  const removeAirplaneByIndex = (index: number): boolean => {
    if (index < 0 || index >= airplanes.value.length) return false;

    const airplane = airplanes.value[index];

    // Удаляем из сцены
    airplane.removeFromScene(world);

    // Диспоузим компонент
    airplane.dispose();

    // Удаляем из массива
    airplanes.value.splice(index, 1);

    // Если самолетиков не осталось, удаляем обработчик обновления
    if (airplanes.value.length === 0 && updateHandler) {
      world.renderer!.onBeforeUpdate.remove(updateHandler);
      updateHandler = null;
    }

    return true;
  };

  // Удаление всех самолетиков
  const removeAllAirplanes = (): void => {
    airplanes.value.forEach((airplane) => {
      airplane.removeFromScene(world);
      airplane.dispose();
    });

    airplanes.value = [];

    // Удаляем обработчик обновления
    if (updateHandler) {
      world.renderer!.onBeforeUpdate.remove(updateHandler);
      updateHandler = null;
    }
  };

  // Получение самолетика по индексу
  const getAirplaneByIndex = (index: number): AirplaneComponent | null => {
    return airplanes.value[index] || null;
  };

  // Получение самолетика по UUID
  const getAirplaneByUuid = (uuid: string): AirplaneComponent | null => {
    return (
      airplanes.value.find((airplane) => airplane.uuid === uuid) || null
    );
  };

  // Получение позиции самолетика
  const getAirplanePosition = (index: number): THREE.Vector3 | null => {
    const airplane = airplanes.value[index];
    if (!airplane) return null;

    return airplane.airplane.position.clone();
  };

  // Получение всех позиций самолетиков
  const getAllAirplanePositions = (): THREE.Vector3[] => {
    return airplanes.value.map((airplane) =>
      airplane.airplane.position.clone()
    );
  };

  // Включение/выключение самолетика
  const toggleAirplane = (index: number, enabled: boolean): void => {
    const airplane = airplanes.value[index];
    if (airplane) {
      airplane.enabled = enabled;
    }
  };

  // Обновление параметров конкретного самолетика
  const updateAirplaneParams = (
    index: number,
    radius?: number,
    centerY?: number,
    speed?: number
  ): void => {
    const airplane = airplanes.value[index];
    if (!airplane) return;

    // Получаем текущие значения через геттеры или используем переданные значения
    const currentRadius = radius ?? airplane.getRadius();
    const currentCenterY = centerY ?? airplane.getCenterY();
    const currentSpeed = speed ?? airplane.getSpeed();

    airplane.setFlightParams(currentRadius, currentCenterY, currentSpeed);
  };

  // Обновление параметров всех самолетиков
  const updateAllAirplanesParams = (
    radius?: number,
    centerY?: number,
    speed?: number
  ): void => {
    airplanes.value.forEach((airplane, index) => {
      updateAirplaneParams(index, radius, centerY, speed);
    });
  };

  // Очистка всех ресурсов
  const dispose = (): void => {
    removeAllAirplanes();
  };

  return {
    airplanes,
    isLoading,

    createAirplane,
    removeAirplane,
    removeAirplaneByIndex,
    removeAllAirplanes,
    getAirplaneByIndex,
    getAirplaneByUuid,
    getAirplanePosition,
    getAllAirplanePositions,
    toggleAirplane,
    updateAirplaneParams,
    updateAllAirplanesParams,
    dispose,
  };
};
