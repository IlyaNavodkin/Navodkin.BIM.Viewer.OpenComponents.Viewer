<script lang="ts" setup>
import { reactive, onMounted, onUnmounted, computed } from "vue";
import { useViewer } from "../composables/useViewer";
import LoadingScreen from "./LoadingScreen.vue";
import Clipper3dSidebar from "./Clipper3dSidebar.vue";
import ElementsSidebar from "./ElementsSidebar.vue";

const container = reactive<{ value: HTMLDivElement | undefined }>({
  value: undefined,
});

const viewer = useViewer();
const {
  isLoading,
  loadingProgress,
  handleFileChange,
  setupViewer,
  disposeViewer,
  filteredElements,
  isLoadingElements,
  selectEmployeePlacement: zoomToElement,
  tableSelectionState,
  levelsData,
  isLoadingLevels,
  toggleLevelClip,
} = viewer;

const modelIsLoaded = computed(() => {
  return viewer.loadedModel.value !== undefined;
});

/**
 * Обработчик нажатия клавиш
 */
const handleKeyDown = (event: KeyboardEvent) => {
  // ESC - очистить выбор стола
  if (event.key === "Escape") {
    tableSelectionState.value?.clearSelection();
  }
};

onMounted(async () => {
  if (!container.value) return;
  await setupViewer(container.value);

  // Добавляем обработчик клавиатуры
  window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  // Удаляем обработчик клавиатуры
  window.removeEventListener("keydown", handleKeyDown);
  disposeViewer();
});
</script>

<template>
  <div :class="$style.root" tabindex="0" @keydown="handleKeyDown">
    <LoadingScreen v-if="isLoading" :progress="loadingProgress" />
    <div :class="$style.layout">
      <Clipper3dSidebar
        :levels-data="levelsData"
        :is-loading-levels="isLoadingLevels"
        :class="$style.sidebar"
        @toggleLevelClip="toggleLevelClip"
      />
      <div :class="$style.mainContent">
        <div :class="$style.toolbar">
          Toolbar
          <input v-if="!modelIsLoaded" type="file" @change="handleFileChange" />
        </div>

        <div
          :ref="(el) => { container.value = el as HTMLDivElement }"
          :class="$style.viewport"
        ></div>
      </div>
      <ElementsSidebar
        :elements="filteredElements"
        :isLoading="isLoadingElements"
        @element-click="zoomToElement"
        :class="$style.elementsSidebar"
      />
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
  flex-shrink: 0;
  height: 100%;
}

.mainContent {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

.infoPanel {
  background-color: #f8f9fa;
  padding: 12px;
  border-bottom: 1px solid #dee2e6;
  font-size: 12px;
}

.infoSection {
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
}

.infoLabel {
  font-weight: 600;
  color: #495057;
  margin-bottom: 4px;
}

.infoValue {
  color: #212529;
  padding-left: 12px;

  div {
    margin-bottom: 4px;

    &:last-child {
      margin-bottom: 0;
    }
  }
}

.elementDetails {
  margin-top: 8px;
  padding: 8px;
  background-color: #e9ecef;
  border-radius: 4px;
  border-left: 3px solid #007bff;

  div {
    margin-bottom: 4px;

    &:last-child {
      margin-bottom: 0;
    }
  }
}

.toolbar {
  display: flex;
  width: 100%;
  height: 50px;
  background-color: #f0f0f0;
  padding: 10px;
  font-size: 14px;
  font-weight: bold;
}

.viewport {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 400px;
  overflow: hidden;
}
</style>
