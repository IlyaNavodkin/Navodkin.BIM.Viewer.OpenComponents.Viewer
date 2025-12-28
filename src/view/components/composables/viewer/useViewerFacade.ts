import { ref, shallowRef, computed, onUnmounted } from "vue";
import { FragmentsModel } from "@thatopen/fragments";
import * as THREE from "three";
import { useViewerCore } from "./core/useViewerCore";
import { useModelManager } from "./core/useModelManager";
import { useModelData } from "./data/useModelData";
import { useSelection } from "./features/useSelection";
import { useMarkers } from "./features/useMarkers";
import { useHover } from "./features/useHover";
import { useClipStyler } from "./features/useClip";
import { useViews } from "./features/useViews";
import {
  useElementFilter,
  type ElementData,
} from "./features/useElementFilter";

/**
 * Фасадный слой для унифицированного доступа ко всем функциям viewer
 * Предоставляет единый API, совместимый с существующим useViewer
 */
export const useViewer = () => {
  // Инициализация базовых слоев
  const core = useViewerCore();
  const modelManager = useModelManager(
    core.components,
    core.workerUrl,
    core.currentWord
  );

  // Инициализация слоя данных
  const modelData = useModelData();

  // Инициализация фич (зависят от core и/или modelManager)
  const selection = shallowRef<ReturnType<typeof useSelection> | undefined>(
    undefined
  );
  const markers = shallowRef<ReturnType<typeof useMarkers> | undefined>(
    undefined
  );
  let hoverState: ReturnType<typeof useHover> | undefined = undefined;
  const clip = shallowRef<ReturnType<typeof useClipStyler> | undefined>(
    undefined
  );
  const views = shallowRef<ReturnType<typeof useViews> | undefined>(undefined);
  const elementFilter = shallowRef<
    ReturnType<typeof useElementFilter> | undefined
  >(undefined);

  // Дополнительные реактивные состояния для совместимости
  const selectedElement = ref<{
    localId: number;
    distance: number;
    point: THREE.Vector3;
  } | null>(null);

  /**
   * Инициализирует viewer и все его компоненты
   * @param containerElement - HTML элемент контейнера
   */
  const setupViewer = async (containerElement: HTMLDivElement) => {
    // Инициализируем базовый слой
    await core.init(containerElement);

    // Инициализируем менеджер моделей
    await modelManager.init();

    // Инициализируем фичи
    selection.value = useSelection(core.components, core.currentWord);
    markers.value = useMarkers(core.components, core.currentWord);
    // hoverState = useHover(core.components, core.currentWord);
    clip.value = useClipStyler(core.components, core.currentWord);
    views.value = useViews(core.components, core.currentWord);

    // Инициализируем фильтр элементов (зависит от modelManager.model)
    if (!selection.value?.highlighter.value) {
      throw new Error("Highlighter не инициализирован");
    }
    elementFilter.value = useElementFilter(
      modelManager.model,
      selection.value.highlighter.value,
      selection.value.mainSelector
    );
  };

  /**
   * Освобождает все ресурсы viewer
   */
  const disposeViewer = async () => {
    // Освобождаем фичи
    elementFilter.value = undefined;
    clip.value = undefined;
    views.value = undefined;
    hoverState = undefined;
    markers.value = undefined;
    selection.value = undefined;
    elementFilter.value = undefined;

    // Освобождаем слои данных
    modelData.clear();

    // Освобождаем менеджер моделей
    modelManager.dispose();

    // Освобождаем базовый слой
    core.dispose();
  };

  /**
   * Загружает IFC модель и инициализирует связанные данные
   * @param path - путь к файлу
   * @param name - имя модели
   */
  const loadIfc = async (path: string, name: string) => {
    const model = await modelManager.load(path, name);

    // Загружаем уровни
    await modelData.loadLevels(model);

    // Создаем views из уровней
    if (views.value && modelData.levelsData.value.length > 0) {
      await views.value.createViewsFromLevels(modelData.levelsData.value);
    }

    // Загружаем отфильтрованные элементы
    await elementFilter.value?.loadFilteredElements();

    return model;
  };

  /**
   * Обрабатывает изменение файла
   */
  const handleFileChange = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const path = URL.createObjectURL(file);
      // Используем loadIfc для полной загрузки с инициализацией всех данных
      await loadIfc(path, file.name);

      if (!modelManager.fragmentManager.value) {
        throw new Error("FragmentManager is null");
      }

      // Проверяем, что модель была добавлена в fragmentManager
      const modelName = file.name;
      const modelExists =
        modelManager.fragmentManager.value.list.has(modelName);

      if (!modelExists) {
        console.warn(
          `Модель "${modelName}" не найдена в fragmentManager. Доступные модели:`,
          Array.from(modelManager.fragmentManager.value.list.keys())
        );
        return;
      }
    }
  };

  /**
   * Переключает клип уровня
   */
  const toggleLevelClip = (levelName: string) => {
    if (!core.currentWord.value) return;

    clip.value?.clearAll();

    const normal = new THREE.Vector3(0, -1, 0);
    const elevationValue = modelData.levelsData.value.find(
      (level) => level.name === levelName
    )?.elevation;
    if (!elevationValue) return;
    const point = new THREE.Vector3(0, elevationValue, 0);

    clip.value?.clipper.value?.createFromNormalAndCoplanarPoint(
      core.currentWord.value,
      normal,
      point
    );
    console.log(`Клип уровня "${levelName}" переключен`);
  };

  /**
   * Получает информацию об элементе
   */
  const getElementInfo = async (
    model: FragmentsModel,
    localId: number
  ): Promise<any> => {
    return await modelData.getElementInfo(model, localId);
  };

  /**
   * Устанавливает выбранный элемент
   */
  const setSelectedElement = (
    element: { localId: number; distance: number; point: THREE.Vector3 } | null
  ) => {
    selectedElement.value = element;
  };

  /**
   * Выбирает размещение сотрудника (стол)
   */
  const selectEmployeePlacement = async (localId: number) => {
    await elementFilter.value?.selectTable(localId);
  };

  /**
   * Выводит элементы в консоль
   */
  const consoleToElements = async (model: FragmentsModel) => {
    const elements = await model.getSpatialStructure();
    console.log(elements);
  };

  // Настраиваем автоматическую очистку при размонтировании
  onUnmounted(() => {
    disposeViewer();
  });

  return {
    // Реактивные состояния (совместимость с существующим API)
    container: core.container,
    components: core.components,
    ifcLoader: modelManager.ifcLoader,
    loadedModel: modelManager.model,
    words: core.words,
    currentWord: core.currentWord,
    fragmentManager: modelManager.fragmentManager,
    hider: modelManager.hider,
    viewsState: views,
    markersState: markers,
    selectionState: selection,
    elementFilterState: elementFilter,
    clipperState: clip,
    filteredElements: computed(
      () => elementFilter.value?.filteredElements.value ?? []
    ),
    isLoadingElements: computed(
      () => elementFilter.value?.isLoadingElements.value ?? false
    ),
    levelsData: modelData.levelsData,
    isLoadingLevels: modelData.isLoadingLevels,
    workerUrl: core.workerUrl,
    isLoading: modelManager.isLoading,
    loadingProgress: modelManager.loadingProgress,
    selectedElement,

    // Методы (совместимость с существующим API)
    getElementInfo,
    setSelectedElement,
    selectEmployeePlacement,
    handleFileChange,
    setupViewer,
    disposeViewer,
    consoleToElements,
    toggleLevelClip,
  };
};

// Экспортируем тип ElementData для использования в компонентах
export type { ElementData };
