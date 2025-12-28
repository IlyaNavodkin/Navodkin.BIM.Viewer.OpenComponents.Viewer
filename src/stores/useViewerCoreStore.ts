import { shallowRef } from "vue";
import * as OBC from "@thatopen/components";
import { FragmentsModel } from "@thatopen/fragments";
import * as OBF from "@thatopen/components-front";
import type { ElementData } from "@/view/components/composables/viewer/features/useElementFilter";

/**
 * Store для хранения состояния viewer
 * Используется как единая точка входа для доступа к данным
 *
 * Архитектура:
 * - Все свойства хранятся в shallowRef для реактивности UI
 * - shallowRef обеспечивает реактивность только на верхнем уровне,
 *   не создавая прокси для вложенных объектов, что избегает конфликтов
 *   с объектами Three.js и OBC (highlighter, components и т.д.)
 */
class ViewerCoreStore {
  core = {
    container: shallowRef<HTMLDivElement | undefined>(undefined),
    components: shallowRef<OBC.Components | undefined>(undefined),
    words: shallowRef<OBC.Worlds | undefined>(undefined),
    currentWord: shallowRef<
      | OBC.SimpleWorld<
          OBC.SimpleScene,
          OBC.SimpleCamera,
          OBF.PostproductionRenderer
        >
      | undefined
    >(undefined),
    workerUrl: shallowRef<string | undefined>(undefined),
  };

  modelManager = {
    ifcLoader: shallowRef<OBC.IfcLoader | undefined>(undefined),
    model: shallowRef<FragmentsModel | undefined>(undefined),
    fragmentManager: shallowRef<OBC.FragmentsManager | undefined>(undefined),
    hider: shallowRef<OBC.Hider | undefined>(undefined),
    finder: shallowRef<OBC.ItemsFinder | undefined>(undefined),

    // Реактивные свойства для UI
    isLoading: shallowRef(false),
    loadingProgress: shallowRef(0),
  };

  features = {
    clip: {
      clipper: shallowRef<OBC.Clipper | undefined>(undefined),
      clipStyler: shallowRef<OBF.ClipStyler | undefined>(undefined),
    },
    elementFilter: {
      // Реактивные свойства для UI
      filteredElements: shallowRef<ElementData[]>([]),
      selectedTableId: shallowRef<number | null>(null),
    },
    selection: {
      highlighter: shallowRef<OBF.Highlighter | undefined>(undefined),
      mainOutliner: shallowRef<OBF.Outliner | undefined>(undefined),
    },
  };

  /**
   * Устанавливает isLoading
   */
  setIsLoading(value: boolean) {
    this.modelManager.isLoading.value = value;
  }

  /**
   * Устанавливает loadingProgress
   */
  setLoadingProgress(value: number) {
    this.modelManager.loadingProgress.value = value;
  }

  /**
   * Сбрасывает все состояния store
   */
  reset() {
    this.core.container.value = undefined;
    this.core.components.value = undefined;
    this.core.words.value = undefined;
    this.core.currentWord.value = undefined;
    this.core.workerUrl.value = undefined;

    this.modelManager.ifcLoader.value = undefined;
    this.modelManager.model.value = undefined;
    this.modelManager.fragmentManager.value = undefined;
    this.modelManager.hider.value = undefined;
    this.modelManager.finder.value = undefined;
    this.modelManager.isLoading.value = false;
    this.modelManager.loadingProgress.value = 0;

    this.features.clip.clipper.value = undefined;
    this.features.clip.clipStyler.value = undefined;
    this.features.elementFilter.filteredElements.value = [];
    this.features.elementFilter.selectedTableId.value = null;
    this.features.selection.highlighter.value = undefined;
    this.features.selection.mainOutliner.value = undefined;
  }
}

// Единый экземпляр store (singleton)
const viewerCoreStore = new ViewerCoreStore();

/**
 * Получить экземпляр store
 * Используется как единая точка входа для доступа к данным viewer
 */
export const useViewerCoreStore = () => viewerCoreStore;
