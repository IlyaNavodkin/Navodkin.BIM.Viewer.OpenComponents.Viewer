import { computed, onUnmounted } from "vue";
import { FragmentsModel } from "@thatopen/fragments";
import * as THREE from "three";
import { useViewerCoreStore } from "@/stores/useViewerCoreStore";
import { useViewerCore } from "./core/useViewerCore";
import { useModelManager } from "./core/useModelManager";
import { useModelData } from "./data/useModelData";
import { useSelection } from "./features/useSelection";
import { useClipStyler } from "./features/useClip";
import { useElementFilter } from "./features/useElementFilter";
import type { ElementData } from "./features/useElementFilter";

/**
 * Фасадный слой для работы с viewer
 *
 * Архитектура:
 * - Все состояния хранятся в нереактивном store (useViewerCoreStore)
 * - Store используется как единая точка входа, но НЕ реактивный
 * - Для реактивности используются ref/computed только для примитивов
 * - Composables работают напрямую со store
 * - Фасад предоставляет удобный API и методы высокого уровня
 *
 * Принципы:
 * - Минимализм: возвращаем только то, что действительно нужно
 * - Прямой доступ: используем store напрямую
 * - Простота: методы делают одну вещь и делают её хорошо
 * - Нет реактивности для больших объектов (Three.js, OBC) - избегаем конфликтов с прокси
 */
export const useViewer = () => {
  const store = useViewerCoreStore();

  // Используем shallowRef из store напрямую - они уже реактивные
  const isLoading = store.modelManager.isLoading;
  const loadingProgress = store.modelManager.loadingProgress;

  // Инициализируем composables (они работают напрямую со store)
  const core = useViewerCore();
  const modelManager = useModelManager();
  const modelData = useModelData();
  const selection = useSelection();
  const clip = useClipStyler();
  const elementFilter = useElementFilter();

  /**
   * Инициализирует viewer и все его компоненты
   */
  const setupViewer = async (containerElement: HTMLDivElement) => {
    console.log(
      `[useViewer.setupViewer] Начало. isLoading: ${store.modelManager.isLoading.value}`
    );
    await core.init(containerElement);
    console.log(
      `[useViewer.setupViewer] После core.init. isLoading: ${store.modelManager.isLoading.value}`
    );
    await modelManager.init();
    console.log(
      `[useViewer.setupViewer] После modelManager.init. isLoading: ${store.modelManager.isLoading.value}`
    );
    selection.init();
    clip.init();
    console.log(
      `[useViewer.setupViewer] Конец. isLoading: ${store.modelManager.isLoading.value}`
    );
  };

  /**
   * Освобождает все ресурсы viewer
   */
  const disposeViewer = () => {
    clip.dispose();
    selection.clearOutlines();
    modelData.clear();
    elementFilter.clear();
    modelManager.dispose();
    core.dispose();
  };

  /**
   * Загружает IFC модель и инициализирует связанные данные
   */
  const loadIfc = async (
    path: string,
    name: string
  ): Promise<FragmentsModel> => {
    const model = await modelManager.load(path, name);
    await modelData.loadLevels(model);
    await elementFilter.loadFilteredElements();
    return model;
  };

  /**
   * Обрабатывает изменение файла и загружает модель
   */
  const handleFileChange = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const path = URL.createObjectURL(file);
    await loadIfc(path, file.name);

    // Проверяем, что модель была добавлена
    if (!store.modelManager.fragmentManager.value) {
      throw new Error("FragmentManager не инициализирован");
    }

    const modelExists = store.modelManager.fragmentManager.value.list.has(
      file.name
    );
    if (!modelExists) {
      console.warn(
        `Модель "${file.name}" не найдена в fragmentManager.`,
        `Доступные модели: ${Array.from(
          store.modelManager.fragmentManager.value.list.keys()
        ).join(", ")}`
      );
    }
  };

  /**
   * Переключает клип уровня
   */
  const toggleLevelClip = (levelName: string) => {
    if (!store.core.currentWord.value || !store.features.clip.clipper.value)
      return;

    const level = modelData.levelsData.value.find((l) => l.name === levelName);
    if (!level) {
      console.warn(`Уровень "${levelName}" не найден`);
      return;
    }

    clip.clearAll();

    const normal = new THREE.Vector3(0, -1, 0);
    const point = new THREE.Vector3(0, level.elevation, 0);

    store.features.clip.clipper.value.createFromNormalAndCoplanarPoint(
      store.core.currentWord.value as any,
      normal,
      point
    );
  };

  /**
   * Выбирает размещение сотрудника (стол)
   */
  const selectEmployeePlacement = async (localId: number) => {
    await elementFilter.selectTable(localId);
  };

  // Автоматическая очистка при размонтировании
  onUnmounted(() => {
    // Удаляем функцию синхронизации
    delete (store as any).__syncRefs;
    disposeViewer();
  });

  return {
    // ============================================
    // Состояния из store (реактивные через computed для объектов, ref для примитивов)
    // ============================================

    // Core состояния (используем shallowRef напрямую)
    container: store.core.container,
    components: store.core.components,
    currentWord: store.core.currentWord,
    workerUrl: store.core.workerUrl,

    // Состояния модели
    loadedModel: store.modelManager.model,
    isLoading, // shallowRef для реактивности
    loadingProgress, // shallowRef для реактивности

    // Состояния данных (используем ref напрямую - они уже реактивные)
    levelsData: modelData.levelsData,
    isLoadingLevels: modelData.isLoadingLevels,

    // Состояния фильтрации элементов (используем shallowRef напрямую)
    filteredElements: store.features.elementFilter.filteredElements,
    selectedTableId: store.features.elementFilter.selectedTableId,

    // ============================================
    // Computed свойства для удобства
    // ============================================

    /**
     * Проверяет, загружена ли модель
     */
    isModelLoaded: computed(() => store.modelManager.model.value !== undefined),

    /**
     * Проверяет, загружаются ли элементы
     */
    isLoadingElements: computed(() => store.modelManager.isLoading.value),

    // ============================================
    // Composables для прямого доступа к методам
    // ============================================

    /**
     * Фильтр элементов - методы для работы с элементами
     */
    elementFilter: {
      selectTable: elementFilter.selectTable,
      clearSelection: elementFilter.clearSelection,
      showPreview: elementFilter.showPreview,
      clearPreview: elementFilter.clearPreview,
      loadFilteredElements: elementFilter.loadFilteredElements,
      // Методы работы с сотрудниками и местами
      getPlacementNumber: elementFilter.getPlacementNumber,
      isPlacementOccupied: elementFilter.isPlacementOccupied,
      getEmployeeByPlacement: elementFilter.getEmployeeByPlacement,
    },

    /**
     * Выделение - методы для работы с выделением
     */
    selection: {
      clearOutlines: selection.clearOutlines,
      createCustomHighlighter: selection.createCustomHighlighter,
      applyCustomHighlight: selection.applyCustomHighlight,
      resetCustomHighlighter: selection.resetCustomHighlighter,
    },

    /**
     * Клиппинг - методы для работы с клиппингом
     */
    clip: {
      clearAll: clip.clearAll,
    },

    /**
     * Данные модели - методы для работы с данными
     */
    modelData: {
      getElementInfo: modelData.getElementInfo,
      getEntityData: modelData.getEntityData,
    },

    // ============================================
    // Методы высокого уровня
    // ============================================

    setupViewer,
    disposeViewer,
    loadIfc,
    handleFileChange,
    toggleLevelClip,
    selectEmployeePlacement,
  };
};

// Экспортируем типы
export type { ElementData };
