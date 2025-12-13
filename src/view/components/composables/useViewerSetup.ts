import * as THREE from "three";
import * as OBC from "@thatopen/components";
import {
  configureRenderer,
  getRendererParameters,
} from "../configs/rendererConfig";
import {
  configureCamera,
  DEFAULT_CAMERA_POSITION,
} from "../configs/cameraConfig";
import {
  configureFragmentsSettings,
  setupFragmentsCameraHandlers,
  setupFragmentsModelHandler,
  FAST_UPDATE_CONFIG,
} from "../configs/fragmentsConfig";

/**
 * Композабл для настройки и инициализации viewer компонентов
 */
export const useViewerSetup = () => {
  /**
   * Инициализирует мир с настройками рендерера и камеры
   */
  const initWorld = async (
    container: HTMLDivElement,
    components: OBC.Components
  ) => {
    const worlds = components.get(OBC.Worlds);

    const world = worlds.create<
      OBC.SimpleScene,
      OBC.SimpleCamera,
      OBC.SimpleRenderer
    >();

    const scene = new OBC.SimpleScene(components);
    const renderer = new OBC.SimpleRenderer(
      components,
      container,
      getRendererParameters()
    );
    const camera = new OBC.SimpleCamera(components);

    world.scene = scene;
    world.renderer = renderer;
    world.camera = camera;

    // Настройка сцены
    scene.setup();
    (scene.three as THREE.Scene).background = new THREE.Color(0xf0f0f0);

    // Настройка рендерера
    configureRenderer(renderer);

    // Настройка камеры
    configureCamera(world.camera.three);

    // Начальная позиция камеры
    await camera.controls.setLookAt(
      DEFAULT_CAMERA_POSITION.position.x,
      DEFAULT_CAMERA_POSITION.position.y,
      DEFAULT_CAMERA_POSITION.position.z,
      DEFAULT_CAMERA_POSITION.target.x,
      DEFAULT_CAMERA_POSITION.target.y,
      DEFAULT_CAMERA_POSITION.target.z
    );

    // Добавление сетки
    const grids = components.get(OBC.Grids);
    const grid = grids.create(world);
    grid.config.color.set(0x888888);

    // Инициализация компонентов (запускает рендеринг)
    components.init();

    return { world, renderer, camera };
  };

  /**
   * Настраивает FragmentsManager с оптимальными параметрами
   */
  const setupFragments = (
    fragments: OBC.FragmentsManager,
    camera: OBC.SimpleCamera,
    world: OBC.World,
    config = FAST_UPDATE_CONFIG
  ) => {
    // Применяем настройки
    configureFragmentsSettings(fragments, config);

    // Настраиваем обработчики камеры
    setupFragmentsCameraHandlers(camera, fragments);

    // Настраиваем обработчик загрузки моделей
    setupFragmentsModelHandler(fragments, world);
  };

  return {
    initWorld,
    setupFragments,
  };
};
