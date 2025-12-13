import * as THREE from "three";
import * as OBC from "@thatopen/components";

/**
 * Конфигурация настроек FragmentsManager
 * Эти настройки контролируют частоту обновлений визуализации и frustum culling
 */
export interface FragmentsSettingsConfig {
  /** Уровень качества графики: 0 = низкое, 1 = высокое */
  graphicsQuality: number;
  /** Максимальная частота обновлений в миллисекундах */
  maxUpdateRate: number;
  /** Частота принудительных обновлений в миллисекундах */
  forceUpdateRate: number;
  /** Буфер времени для принудительных обновлений в миллисекундах */
  forceUpdateBuffer: number;
  /** Автоматическая координация позиций моделей */
  autoCoordinate: boolean;
}

/**
 * Стандартная конфигурация для быстрого обновления
 * Оптимизирована для предотвращения видимого появления элементов
 */
export const FAST_UPDATE_CONFIG: FragmentsSettingsConfig = {
  // graphicsQuality - уровень качества графики
  // 0 = низкое качество (больше оптимизаций, агрессивный culling, более заметный LOD)
  // 1 = высокое качество (меньше оптимизаций, менее агрессивный culling, менее заметный LOD)
  graphicsQuality: 1,

  // maxUpdateRate - максимальная частота обновлений (в миллисекундах)
  // Определяет минимальный интервал между обновлениями визуализации
  // Меньшее значение = более частые обновления = плавнее, но больше нагрузка
  maxUpdateRate: 0,

  // forceUpdateRate - частота принудительных обновлений (в миллисекундах)
  // Используется для принудительного обновления даже если прошло меньше времени
  // чем maxUpdateRate. Помогает гарантировать обновление при важных событиях
  forceUpdateRate: 0,

  // forceUpdateBuffer - буфер времени для принудительных обновлений (в миллисекундах)
  // Определяет окно времени, в течение которого принудительное обновление будет применено
  forceUpdateBuffer: 0,

  // autoCoordinate - автоматическая координация позиций моделей
  // Если true, модели автоматически выравниваются относительно первой загруженной модели
  autoCoordinate: true,
};

/**
 * Конфигурация для баланса между качеством и производительностью
 */
export const BALANCED_CONFIG: FragmentsSettingsConfig = {
  graphicsQuality: 1,
  maxUpdateRate: 100,
  forceUpdateRate: 200,
  forceUpdateBuffer: 200,
  autoCoordinate: true,
};

/**
 * Конфигурация для максимальной производительности
 */
export const PERFORMANCE_CONFIG: FragmentsSettingsConfig = {
  graphicsQuality: 0,
  maxUpdateRate: 200,
  forceUpdateRate: 500,
  forceUpdateBuffer: 500,
  autoCoordinate: true,
};

/**
 * Применяет конфигурацию к настройкам FragmentsManager
 * @param fragments - экземпляр FragmentsManager
 * @param config - конфигурация (по умолчанию используется FAST_UPDATE_CONFIG)
 */
export const configureFragmentsSettings = (
  fragments: OBC.FragmentsManager,
  config: FragmentsSettingsConfig = FAST_UPDATE_CONFIG
): void => {
  const settings = fragments.core.settings;

  settings.graphicsQuality = config.graphicsQuality;
  settings.maxUpdateRate = config.maxUpdateRate;
  settings.forceUpdateRate = config.forceUpdateRate;
  settings.forceUpdateBuffer = config.forceUpdateBuffer;
  settings.autoCoordinate = config.autoCoordinate;
};

/**
 * Настраивает обработчики событий камеры для обновления фрагментов
 * @param camera - камера с контролами
 * @param fragments - экземпляр FragmentsManager
 */
export const setupFragmentsCameraHandlers = (
  camera: OBC.SimpleCamera,
  fragments: OBC.FragmentsManager
): void => {
  const cameraControls = camera.controls;

  if (!cameraControls) return;

  // Обновление при остановке камеры (оптимизация производительности)
  // Используется для финальной оптимизации после завершения движения
  // Параметр true = принудительное обновление всех моделей
  cameraControls.addEventListener("rest", () => {
    fragments.core.update(true);
  });

  // Обновление во время движения камеры (для предотвращения пропадания объектов)
  // Это обеспечивает плавное обновление видимости во время движения
  // БЕЗ ЭТОГО объекты могут пропадать при отдалении камеры
  // Параметр true = принудительное обновление всех моделей
  cameraControls.addEventListener("control", () => {
    fragments.core.update(true);
  });
};

/**
 * Настраивает обработчик для загружаемых моделей Fragments
 * @param fragments - экземпляр FragmentsManager
 * @param world - мир, в который добавляются модели
 */
export const setupFragmentsModelHandler = (
  fragments: OBC.FragmentsManager,
  world: OBC.World
): void => {
  // Когда модель Fragments загружается, нужно настроить её для работы
  // с ПРОДВИНУТЫМ frustum culling от @thatopen/components
  fragments.list.onItemSet.add(({ value: model }) => {
    // useCamera() - связывает модель с камерой для ПРОДВИНУТОГО frustum culling и LOD
    // БЕЗ ЭТОГО продвинутый culling от @thatopen/components работать НЕ БУДЕТ!
    // Three.js culling будет работать, но без оптимизаций для больших моделей
    // Модель должна знать о камере, чтобы определять, какие части видны и нужен ли LOD
    model.useCamera(
      world.camera.three as THREE.PerspectiveCamera | THREE.OrthographicCamera
    );

    // Добавляем модель в сцену
    world.scene.three.add(model.object);

    // Обновляем фрагменты после добавления модели
    // Параметр true = принудительное обновление всех моделей
    // Это гарантирует, что модель будет правильно отображаться с учетом frustum culling
    fragments.core.update(true);
  });
};
