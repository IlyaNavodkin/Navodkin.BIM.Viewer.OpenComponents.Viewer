import { computed } from "vue";
import { defineStore } from "pinia";
import { createViewerCoreModule } from "./modules/useViewerCore";
import { createModelManagerModule } from "./modules/useViewerModelManager";
import { createSelectionModule } from "./modules/useViewerSelection";
import { createLevelModule } from "./modules/useViewerLevel";
import { createEmployeeWorkplaceModule } from "./modules/useViewerEmployeeWorkplace";

/**
 * Фабрика для создания изолированного стора вьювера с уникальным ID
 *
 * Использует модульную архитектуру:
 * - core: управление контейнером, компонентами, world
 * - modelManager: управление IFC моделями и загрузкой
 * - selection: управление выделением элементов
 * - level: управление уровнями (этажами) здания
 * - employeeWorkplace: управление рабочими местами (данные + маркеры)
 *
 * Каждый модуль изолирован, переиспользуем и легко тестируем.
 * Позволяет иметь несколько независимых экземпляров вьювера.
 */
export const createViewerStore = (viewerId: string) => {
  return defineStore(`ifcViewer-${viewerId}`, () => {
    // ========================================
    // MODULES (изолированные модули с state и actions)
    // ========================================

    const core = createViewerCoreModule();
    const modelManager = createModelManagerModule();
    const selection = createSelectionModule();
    const level = createLevelModule();
    const employeeWorkplace = createEmployeeWorkplaceModule();

    // ========================================
    // FEATURES (группировка модулей)
    // ========================================

    const features = computed(() => ({
      selection: selection.value,
      level: level.value,
      employeeWorkplace: employeeWorkplace.value,
    }));

    // ========================================
    // COMPLEX ACTIONS (комплексные операции)
    // ========================================

    function reset() {
      core.value.clear();
      modelManager.value.clear();
      selection.value.clear();
      level.value.clear();
      employeeWorkplace.value.clearAll();
    }

    /**
     * Полная очистка и освобождение ресурсов стора
     * Вызывается при размонтировании компонента вьювера
     */
    function dispose() {
      console.log(`[ViewerStore ${viewerId}] Disposing...`);

      // Освобождаем все ресурсы
      reset();

      console.log(`[ViewerStore ${viewerId}] Disposed successfully`);
    }

    // ========================================
    // RETURN (публичный API стора)
    // ========================================

    return {
      // Metadata
      viewerId,

      // Модули (каждый модуль - это computed с state и actions)
      core,
      modelManager,
      features,

      // Глобальные действия
      reset,
      dispose,
    };
  });
};

// Тип стора для использования в других модулях
export type ViewerStore = ReturnType<ReturnType<typeof createViewerStore>>;

// Дефолтный экземпляр для обратной совместимости
export const useIFCViewerStore = createViewerStore("default");
