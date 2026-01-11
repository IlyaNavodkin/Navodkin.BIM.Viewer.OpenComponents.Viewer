import { ref, computed, shallowRef } from "vue";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";

/**
 * Модуль для управления ядром viewer'а (контейнер, компоненты, world)
 */
export function createViewerCoreModule() {
  // ========================================
  // STATE (приватные реактивные переменные)
  // ========================================

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

  // ========================================
  // COMPUTED API
  // ========================================

  const api = computed(() => ({
    // ===== STATE =====
    container: _container.value,
    components: _components.value,
    worlds: _worlds.value,
    currentWorld: _currentWorld.value,
    workerUrl: _workerUrl.value,

    // ===== ACTIONS =====
    setContainer: (container: HTMLDivElement | undefined) => {
      _container.value = container;
    },

    setComponents: (components: OBC.Components | undefined) => {
      _components.value = components;
    },

    setWorlds: (worlds: OBC.Worlds | undefined) => {
      _worlds.value = worlds;
    },

    setCurrentWorld: (
      world:
        | OBC.SimpleWorld<
            OBC.SimpleScene,
            OBC.SimpleCamera,
            OBF.PostproductionRenderer
          >
        | undefined
    ) => {
      _currentWorld.value = world;
    },

    setWorkerUrl: (url: string | undefined) => {
      _workerUrl.value = url;
    },

    initialize: (
      container: HTMLDivElement,
      components: OBC.Components,
      worlds: OBC.Worlds,
      world: OBC.SimpleWorld<
        OBC.SimpleScene,
        OBC.SimpleCamera,
        OBF.PostproductionRenderer
      >,
      workerUrl: string
    ) => {
      _container.value = container;
      _components.value = components;
      _worlds.value = worlds;
      _currentWorld.value = world;
      _workerUrl.value = workerUrl;
    },

    clear: () => {
      _container.value = undefined;
      _components.value = undefined;
      _worlds.value = undefined;
      _currentWorld.value = undefined;
      _workerUrl.value = undefined;
    },
  }));

  return api;
}
