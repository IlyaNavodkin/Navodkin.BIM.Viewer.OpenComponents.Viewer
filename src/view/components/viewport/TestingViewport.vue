<script lang="ts" setup>
import { reactive, onMounted, onUnmounted, shallowRef } from "vue";
import { useSelection } from "../composables/useSelection";
import { useViewer } from "../composables/useViewer";
import LoadingScreen from "./LoadingScreen.vue";
import ViewSidebar from "./ViewSidebar.vue";
import * as OBC from "@thatopen/components";

const container = reactive<{ value: HTMLDivElement | undefined }>({
  value: undefined,
});

const viewer = useViewer();
const {
  isLoading,
  loadingProgress,
  components,
  handleFileChange,
  setupViewer,
  disposeViewer,
  modelNames,
  currentWord,
  views,
  viewsList,
} = viewer;

const highlighterRef = shallowRef<ReturnType<typeof useSelection> | undefined>(
  undefined
);

onMounted(async () => {
  if (!container.value) return;
  await setupViewer(container.value);

  // Настраиваем автоматическое выделение при клике
  if (components.value && currentWord.value) {
    const selection = useSelection(components.value, currentWord.value);
    highlighterRef.value = selection;

    // Получаем Raycasters для автоматического выделения при клике
    // Raycaster автоматически будет вызывать highlighter при клике
    components.value.get(OBC.Raycasters).get(currentWord.value);

    // Выделение происходит автоматически при одинарном клике!
    console.log("Автоматическое выделение настроено");

    // viewsList теперь доступен из useViewer
    console.log("Views list:", viewsList.value);
  }
});

onUnmounted(() => {
  disposeViewer();
});
</script>

<template>
  <div :class="$style.root" tabindex="0">
    <LoadingScreen v-if="isLoading" :progress="loadingProgress" />
    <div :class="$style.layout">
      <ViewSidebar
        :views="views"
        :views-list="viewsList || []"
        :class="$style.sidebar"
      />
      <div :class="$style.mainContent">
        <div :class="$style.infoPanel">
          <div :class="$style.infoSection">
            <div :class="$style.infoLabel">Загруженные модели:</div>
            <div :class="$style.infoValue">
              {{ modelNames || "Нет моделей" }}
            </div>
          </div>
          <div :class="$style.infoSection">
            <div :class="$style.infoLabel">Выделение:</div>
            <div :class="$style.infoValue">
              Кликните на элемент для выделения. Информация отобразится в
              консоли.
            </div>
          </div>
        </div>
        <div :class="$style.toolbar">
          Toolbar
          <input type="file" @change="handleFileChange" />
        </div>

        <div
          :ref="(el) => { container.value = el as HTMLDivElement }"
          :class="$style.viewport"
        ></div>
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
