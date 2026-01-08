import { ref, shallowRef, computed } from "vue";
import { defineStore } from "pinia";
import * as OBC from "@thatopen/components";
import { FragmentsModel } from "@thatopen/fragments";
import * as OBF from "@thatopen/components-front";
import {
  LevelsViewData,
  EmployeeWorkplaceViewData,
} from "@/view/components/composables/viewer/data/useDataAccess";

export const useIFCViewerStore = defineStore("ifcViewer", () => {
  // ========================================
  // STATE (приватные реактивные переменные)
  // ========================================

  // Core
  const _container = ref<HTMLDivElement | undefined>(undefined);
  const _components = shallowRef<OBC.Components | undefined>(undefined);
  const _worlds = shallowRef<OBC.Worlds | undefined>(undefined);
  const _currentWorld = shallowRef<
    | OBC.SimpleWorld<
        OBC.SimpleScene,
        OBC.SimpleCamera,
        OBF.PostproductionRenderer
      >
    | undefined
  >(undefined);
  const _workerUrl = ref<string | undefined>(undefined);

  // Model Manager
  const _ifcLoader = shallowRef<OBC.IfcLoader | undefined>(undefined);
  const _model = shallowRef<FragmentsModel | undefined>(undefined);
  const _fragmentManager = shallowRef<OBC.FragmentsManager | undefined>(
    undefined
  );
  const _hider = shallowRef<OBC.Hider | undefined>(undefined);
  const _finder = shallowRef<OBC.ItemsFinder | undefined>(undefined);
  const _isLoading = ref(false);
  const _loadingProgress = ref(0);

  // Selection
  const _highlighter = shallowRef<OBF.Highlighter | undefined>(undefined);
  const _outliner = shallowRef<OBF.Outliner | undefined>(undefined);
  const _hoveredElement = ref<{ modelId: string; localId: number } | undefined>(
    undefined
  );
  const _highlightedElement = ref<
    { modelId: string; localId: number } | undefined
  >(undefined);

  // Elements Data
  const _levels = shallowRef<LevelsViewData[]>([]);
  const _levelsLoading = ref(false);
  const _employeeWorkplaces = shallowRef<EmployeeWorkplaceViewData[]>([]);
  const _employeeWorkplacesLoading = ref(false);

  // ========================================
  // COMPUTED (readonly геттеры)
  // ========================================

  const core = computed(() => ({
    container: _container.value,
    components: _components.value,
    worlds: _worlds.value,
    currentWorld: _currentWorld.value,
    workerUrl: _workerUrl.value,
  }));

  const modelManager = computed(() => ({
    ifcLoader: _ifcLoader.value,
    model: _model.value,
    fragmentManager: _fragmentManager.value,
    hider: _hider.value,
    finder: _finder.value,
    isLoading: _isLoading.value,
    loadingProgress: _loadingProgress.value,
  }));

  const features = computed(() => ({
    selection: {
      highlighter: _highlighter.value,
      outliner: _outliner.value,
      hoveredElement: _hoveredElement.value,
      highlightedElement: _highlightedElement.value,
    },
    elementsData: {
      levels: {
        data: _levels.value,
        isLoading: _levelsLoading.value,
      },
      employeeWorkplaces: {
        data: _employeeWorkplaces.value,
        isLoading: _employeeWorkplacesLoading.value,
      },
    },
  }));

  // ========================================
  // CORE ACTIONS (мутации core)
  // ========================================

  function setCoreContainer(container: HTMLDivElement | undefined) {
    _container.value = container;
  }

  function setCoreComponents(components: OBC.Components | undefined) {
    _components.value = components;
  }

  function setCoreWorlds(worlds: OBC.Worlds | undefined) {
    _worlds.value = worlds;
  }

  function setCoreCurrentWorld(
    world:
      | OBC.SimpleWorld<
          OBC.SimpleScene,
          OBC.SimpleCamera,
          OBF.PostproductionRenderer
        >
      | undefined
  ) {
    _currentWorld.value = world;
  }

  function setCoreWorkerUrl(url: string | undefined) {
    _workerUrl.value = url;
  }

  function initializeCore(
    container: HTMLDivElement,
    components: OBC.Components,
    worlds: OBC.Worlds,
    world: OBC.SimpleWorld<
      OBC.SimpleScene,
      OBC.SimpleCamera,
      OBF.PostproductionRenderer
    >,
    workerUrl: string
  ) {
    _container.value = container;
    _components.value = components;
    _worlds.value = worlds;
    _currentWorld.value = world;
    _workerUrl.value = workerUrl;
  }

  function clearCore() {
    _container.value = undefined;
    _components.value = undefined;
    _worlds.value = undefined;
    _currentWorld.value = undefined;
    _workerUrl.value = undefined;
  }

  // ========================================
  // MODEL MANAGER ACTIONS (мутации modelManager)
  // ========================================

  function setIfcLoader(loader: OBC.IfcLoader | undefined) {
    _ifcLoader.value = loader;
  }

  function setModel(model: FragmentsModel | undefined) {
    _model.value = model;
  }

  function setFragmentManager(manager: OBC.FragmentsManager | undefined) {
    _fragmentManager.value = manager;
  }

  function setHider(hider: OBC.Hider | undefined) {
    _hider.value = hider;
  }

  function setFinder(finder: OBC.ItemsFinder | undefined) {
    _finder.value = finder;
  }

  function setIsLoading(value: boolean) {
    _isLoading.value = value;
  }

  function setLoadingProgress(value: number) {
    const clampedValue = Math.min(100, Math.max(0, value));
    _loadingProgress.value = clampedValue;
  }

  function initializeModelManager(
    ifcLoader: OBC.IfcLoader,
    fragmentManager: OBC.FragmentsManager,
    hider: OBC.Hider,
    finder: OBC.ItemsFinder
  ) {
    _ifcLoader.value = ifcLoader;
    _fragmentManager.value = fragmentManager;
    _hider.value = hider;
    _finder.value = finder;
  }

  function clearModelManager() {
    _ifcLoader.value = undefined;
    _model.value = undefined;
    _fragmentManager.value = undefined;
    _hider.value = undefined;
    _finder.value = undefined;
    _isLoading.value = false;
    _loadingProgress.value = 0;
  }

  // ========================================
  // SELECTION ACTIONS (мутации selection)
  // ========================================

  function setHighlighter(highlighter: OBF.Highlighter | undefined) {
    _highlighter.value = highlighter;
  }

  function setAllPlacementsOutliner(outliner: OBF.Outliner | undefined) {
    _outliner.value = outliner;
  }

  function setCurrentHoveredElement(
    element: { modelId: string; localId: number } | undefined
  ) {
    _hoveredElement.value = element;
  }

  function setCurrentSelectedElement(
    element: { modelId: string; localId: number } | undefined
  ) {
    _highlightedElement.value = element;
  }

  function initializeSelection(
    highlighter: OBF.Highlighter,
    outliner: OBF.Outliner
  ) {
    _highlighter.value = highlighter;
    _outliner.value = outliner;
  }

  function clearSelection() {
    _highlighter.value = undefined;
    _outliner.value = undefined;
    _hoveredElement.value = undefined;
    _highlightedElement.value = undefined;
  }

  // ========================================
  // ELEMENTS DATA ACTIONS (мутации elementsData)
  // ========================================

  function setLevels(levels: LevelsViewData[]) {
    _levels.value = levels;
  }

  function setLevelsLoading(loading: boolean) {
    _levelsLoading.value = loading;
  }

  function updateLevels(levels: LevelsViewData[], loading: boolean = false) {
    _levels.value = levels;
    _levelsLoading.value = loading;
  }

  function clearLevels() {
    _levels.value = [];
    _levelsLoading.value = false;
  }

  function setEmployeeWorkplaces(workplaces: EmployeeWorkplaceViewData[]) {
    _employeeWorkplaces.value = workplaces;
  }

  function setEmployeeWorkplacesLoading(loading: boolean) {
    _employeeWorkplacesLoading.value = loading;
  }

  function updateEmployeeWorkplaces(
    workplaces: EmployeeWorkplaceViewData[],
    loading: boolean = false
  ) {
    _employeeWorkplaces.value = workplaces;
    _employeeWorkplacesLoading.value = loading;
  }

  function clearEmployeeWorkplaces() {
    _employeeWorkplaces.value = [];
    _employeeWorkplacesLoading.value = false;
  }

  function clearElementsData() {
    clearLevels();
    clearEmployeeWorkplaces();
  }

  // ========================================
  // COMPLEX ACTIONS (комплексные операции)
  // ========================================

  function reset() {
    clearCore();
    clearModelManager();
    clearSelection();
    clearElementsData();
  }

  // ========================================
  // RETURN (публичный API стора)
  // ========================================

  return {
    // Readonly computed геттеры
    core,
    modelManager,
    features,

    // Core actions
    setCoreContainer,
    setCoreComponents,
    setCoreWorlds,
    setCoreCurrentWorld,
    setCoreWorkerUrl,
    initializeCore,
    clearCore,

    // Model Manager actions
    setIfcLoader,
    setModel,
    setFragmentManager,
    setHider,
    setFinder,
    setIsLoading,
    setLoadingProgress,
    initializeModelManager,
    clearModelManager,

    // Selection actions
    setHighlighter,
    setAllPlacementsOutliner,
    setCurrentHoveredElement,
    setCurrentSelectedElement,
    initializeSelection,
    clearSelection,

    // Elements Data actions
    setLevels,
    setLevelsLoading,
    updateLevels,
    clearLevels,
    setEmployeeWorkplaces,
    setEmployeeWorkplacesLoading,
    updateEmployeeWorkplaces,
    clearEmployeeWorkplaces,
    clearElementsData,

    // Complex actions
    reset,
  };
});
