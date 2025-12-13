import * as THREE from "three";
import * as OBC from "@thatopen/components";

/**
 * Конфигурация параметров для SimpleRenderer (WebGLRendererParameters)
 * Эти настройки влияют на производительность и качество рендеринга
 */
export const getRendererParameters =
  (): Partial<THREE.WebGLRendererParameters> => {
    return {
      // antialias - сглаживание краев (антиалиасинг)
      // true = лучше качество, но больше нагрузка на GPU
      // false = меньше нагрузка, но могут быть заметны "зубцы" на краях
      antialias: true,

      // alpha - прозрачность canvas
      // true = canvas может быть прозрачным
      // false = canvas непрозрачный (лучше производительность)
      alpha: false,

      // powerPreference - предпочтение по энергопотреблению
      // "high-performance" = использовать дискретную видеокарту если доступна
      // "low-power" = использовать встроенную видеокарту (для экономии батареи)
      powerPreference: "high-performance",

      // precision - точность шейдеров
      // "highp" = высокая точность (лучше качество, больше нагрузка)
      // "mediump" = средняя точность (баланс)
      // "lowp" = низкая точность (меньше нагрузка, но может быть потеря качества)
      precision: "highp",

      // stencil - поддержка stencil буфера
      // true = включить stencil буфер (нужен для некоторых эффектов)
      // false = отключить (экономия памяти)
      stencil: false,

      // depth - поддержка depth буфера (z-buffer)
      // true = включить (обязательно для 3D)
      // false = отключить (не рекомендуется для 3D)
      depth: true,

      // logarithmicDepthBuffer - логарифмический depth буфер
      // true = лучше точность на больших расстояниях, но больше нагрузка
      // false = стандартный depth буфер
      logarithmicDepthBuffer: false,

      // preserveDrawingBuffer - сохранять буфер рисования
      // true = сохранять содержимое между кадрами (нужно для скриншотов)
      // false = не сохранять (лучше производительность)
      preserveDrawingBuffer: false,
    };
  };

/**
 * Настройка WebGLRenderer после создания
 * @param renderer - экземпляр SimpleRenderer
 */
export const configureRenderer = (renderer: OBC.SimpleRenderer): void => {
  // ============================================
  // РЕЖИМ РЕНДЕРЕРА (RendererMode)
  // ============================================
  // mode определяет, как рендерер обновляет сцену:
  //
  // RendererMode.AUTO (по умолчанию) - автоматический рендеринг
  // - Рендерер автоматически обновляется на каждом тике компонентов (components.init())
  // - Не нужно вызывать renderer.update() вручную
  // - Рекомендуется для большинства случаев
  // - Лучше для интерактивных приложений
  //
  // RendererMode.MANUAL - ручной рендеринг
  // - Рендерер НЕ обновляется автоматически
  // - Нужно вызывать renderer.update() вручную когда нужно обновить сцену
  // - Полезно для оптимизации производительности (рендеринг только когда нужно)
  // - Можно использовать для статичных сцен или когда нужен полный контроль
  renderer.mode = OBC.RendererMode.AUTO;

  const webGLRenderer = renderer.three;

  // setPixelRatio - соотношение пикселей устройства
  // window.devicePixelRatio - использовать реальное соотношение (для Retina дисплеев)
  // 1 - использовать стандартное соотношение (лучше производительность на слабых устройствах)
  // Ограничиваем до 2 для баланса между качеством и производительностью
  webGLRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // outputColorSpace - цветовое пространство
  // THREE.SRGBColorSpace - стандартное цветовое пространство (рекомендуется)
  // THREE.LinearSRGBColorSpace - линейное пространство (для HDR)
  webGLRenderer.outputColorSpace = THREE.SRGBColorSpace;

  // toneMapping - тональная компрессия (для HDR)
  // THREE.NoToneMapping - без тональной компрессии (стандарт)
  // THREE.ACESFilmicToneMapping - для более реалистичного вида
  webGLRenderer.toneMapping = THREE.NoToneMapping;

  // shadowMap - настройки теней (если используются)
  // Раскомментируйте, если нужны тени:
  // webGLRenderer.shadowMap.enabled = true;
  // webGLRenderer.shadowMap.type = THREE.PCFSoftShadowMap; // Мягкие тени
};
