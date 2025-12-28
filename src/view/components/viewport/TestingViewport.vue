<script lang="ts" setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useViewer } from "../composables/viewer";
import LoadingScreen from "./LoadingScreen.vue";
import ElementsSidebar from "./ElementsSidebar.vue";

const containerRef = ref<HTMLDivElement | null>(null);
const viewer = useViewer();

// Используем ref напрямую из viewer - они уже реактивные
// computed отслеживает изменения ref автоматически при чтении .value
const isLoading = computed(() => {
  // Явно читаем значение для реактивности
  return viewer.isLoading.value;
});
const loadingProgress = computed(() => {
  // Явно читаем значение для реактивности
  return viewer.loadingProgress.value;
});

const isModelLoaded = computed(() => {
  const value = viewer.isModelLoaded;
  return typeof value === "object" && value !== null
    ? value.value
    : Boolean(value);
});

watch(
  isLoading,
  (newVal, oldVal) => {
    console.log(
      `[TestingViewport] isLoading изменился: ${oldVal} -> ${newVal}`
    );
  },
  { immediate: true }
);

watch(
  loadingProgress,
  (newVal, oldVal) => {
    console.log(
      `[TestingViewport] loadingProgress изменился: ${oldVal} -> ${newVal}`
    );
  },
  { immediate: true }
);

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    viewer.elementFilter.clearSelection();
  }
};

/**
 * Обработчик наведения на элемент
 */
const handleElementMouseEnter = (localId: number) => {
  viewer.elementFilter.showPreview(localId);
};

/**
 * Обработчик ухода с элемента
 */
const handleElementMouseLeave = () => {
  viewer.elementFilter.clearPreview();
};

/**
 * Инициализация viewer при монтировании компонента
 */
onMounted(async () => {
  console.log(
    `[TestingViewport.onMounted] Начало. isLoading: ${isLoading.value}, loadingProgress: ${loadingProgress.value}`
  );
  if (!containerRef.value) {
    console.error("Container element не найден");
    return;
  }

  try {
    console.log("[TestingViewport.onMounted] Вызываем setupViewer");
    await viewer.setupViewer(containerRef.value);
    console.log(
      `[TestingViewport.onMounted] После setupViewer. isLoading: ${isLoading.value}, loadingProgress: ${loadingProgress.value}`
    );
    window.addEventListener("keydown", handleKeyDown);
  } catch (error) {
    console.error("Ошибка при инициализации viewer:", error);
  }
});

/**
 * Очистка ресурсов при размонтировании
 */
onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
  viewer.disposeViewer();
});
</script>

<template>
  <div :class="$style.root" tabindex="0">
    <!-- Экран загрузки модели (показывается только при активной загрузке) -->
    <LoadingScreen v-if="isLoading" :progress="loadingProgress" />

    <div :class="$style.layout">
      <!-- Сайдбар для управления клиппингом уровней -->
      <!-- <Clipper3dSidebar
        :levels-data="viewer.levelsData"
        :is-loading-levels="viewer.isLoadingLevels"
        :class="$style.sidebar"
        @toggleLevelClip="viewer.toggleLevelClip"
      /> -->

      <!-- Основной контент -->
      <div :class="$style.mainContent">
        <!-- Панель инструментов -->
        <div :class="$style.toolbar">
          <span :class="$style.toolbarTitle">3D Viewer</span>
          <input
            v-if="!isModelLoaded"
            type="file"
            accept=".ifc"
            @change="viewer.handleFileChange"
            :class="$style.fileInput"
          />
        </div>

        <!-- Viewport для 3D сцены -->
        <div ref="containerRef" :class="$style.viewport">
          <!-- Сайдбар с элементами (рабочие места) -->
          <ElementsSidebar
            :elements="viewer.filteredElements"
            :isLoading="viewer.isLoadingElements"
            :selectedElementId="viewer.selectedTableId"
            @element-click="viewer.selectEmployeePlacement"
            @element-mouse-enter="handleElementMouseEnter"
            @element-mouse-leave="handleElementMouseLeave"
            :class="$style.elementsSidebar"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style module lang="scss">
.root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 400px;
  position: relative;
  overflow: hidden;
  background: #f5f5f5;
}

.layout {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.sidebar {
  flex-shrink: 0;
  height: 100%;
}

.elementsSidebar {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  pointer-events: auto;
}

.mainContent {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  background: #ffffff;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 50px;
  padding: 0 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.toolbarTitle {
  font-size: 16px;
  font-weight: 600;
  color: white;
  letter-spacing: 0.5px;
}

.fileInput {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);

  &::file-selector-button {
    padding: 4px 12px;
    margin-right: 12px;
    background: rgba(255, 255, 255, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 4px;
    color: white;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.4);
    }
  }

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.4);
  }
}

.viewport {
  position: relative;
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #1a1a1a;
}
</style>
