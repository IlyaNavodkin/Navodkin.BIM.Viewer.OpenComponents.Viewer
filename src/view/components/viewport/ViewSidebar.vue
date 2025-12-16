<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import * as OBC from "@thatopen/components";

interface Props {
  views: OBC.Views | undefined;
  viewsList: Array<[string, OBC.View]>;
}

const props = defineProps<Props>();

// Храним значения инпутов для каждого view
const distanceValues = ref<Record<string, number>>({});
const rangeValues = ref<Record<string, number>>({});

/**
 * Сбрасывает текущий вид, возвращая камеру в 3D режим
 */
const resetView = () => {
  if (!props.views) {
    console.warn("Views component is not available");
    return;
  }

  try {
    props.views.close();
    console.log("View reset to 3D mode");
  } catch (error) {
    console.error("Error resetting view:", error);
  }
};

/**
 * Открывает выбранный вид при двойном клике
 * @param viewName - имя вида для открытия
 */
const openView = (viewName: string) => {
  if (!props.views || !viewName) {
    console.warn("Views component or view name is not available");
    return;
  }

  const view = props.views.list.get(viewName);
  if (!view) {
    console.warn(`View "${viewName}" not found`);
    return;
  }

  try {
    // Убеждаемся, что настройки view корректны
    view.helpersVisible = true;
    view.planesEnabled = true;
    // Используем текущее значение range или значение из инпута
    if (viewName in rangeValues.value) {
      view.range = rangeValues.value[viewName];
    } else if (!view.range) {
      view.range = 100;
    }

    // Открываем вид
    props.views.open(viewName);
    console.log(`View "${viewName}" opened`);
  } catch (error) {
    console.error(`Error opening view "${viewName}":`, error);
  }
};

/**
 * Проверяет, открыт ли текущий вид
 */
const isViewActive = computed(() => {
  if (!props.views) return false;
  return props.views.active !== null;
});

/**
 * Получает имя активного вида
 */
const activeViewName = computed(() => {
  if (!props.views || !props.views.active) return null;
  
  // Ищем имя активного view в списке
  for (const [name, view] of props.viewsList) {
    if (view === props.views.active) {
      return name;
    }
  }
  
  return null;
});

/**
 * Инициализирует значения инпутов при изменении списка видов
 */
const initializeInputValues = () => {
  props.viewsList.forEach(([viewName, view]) => {
    if (!(viewName in distanceValues.value)) {
      distanceValues.value[viewName] = view.distance ?? 0;
    }
    if (!(viewName in rangeValues.value)) {
      rangeValues.value[viewName] = view.range ?? 100;
    }
  });
};

// Инициализируем значения при изменении списка
watch(() => props.viewsList, () => {
  initializeInputValues();
}, { immediate: true });

/**
 * Обновляет distance для view
 */
const updateDistance = (viewName: string, value: number) => {
  const view = props.views?.list.get(viewName);
  if (view) {
    view.distance = value;
    distanceValues.value[viewName] = value;
  }
};

/**
 * Обновляет range для view
 */
const updateRange = (viewName: string, value: number) => {
  const view = props.views?.list.get(viewName);
  if (view) {
    view.range = value;
    rangeValues.value[viewName] = value;
  }
};
</script>

<template>
  <div :class="$style.sidebar">
    <div :class="$style.header">
      <h3 :class="$style.title">Виды (Views)</h3>
      <button
        :class="[$style.resetButton, { [$style.disabled]: !isViewActive }]"
        @click="resetView"
        :disabled="!isViewActive"
        title="Сбросить вид (вернуться к 3D)"
      >
        <span :class="$style.resetIcon">↺</span>
        <span :class="$style.resetText">Сбросить вид</span>
      </button>
    </div>

    <div :class="$style.content">
      <div v-if="viewsList.length === 0" :class="$style.emptyState">
        <p :class="$style.emptyText">Нет доступных видов</p>
        <p :class="$style.emptyHint">
          Загрузите IFC модель с этажами (IfcBuildingStorey)
        </p>
      </div>

      <div v-else :class="$style.viewsList">
        <div
          v-for="[viewName, view] in viewsList"
          :key="viewName"
          :class="[
            $style.viewItem,
            { [$style.active]: activeViewName === viewName },
          ]"
          @dblclick="openView(viewName)"
          :title="`Двойной клик для открытия вида: ${viewName}`"
        >
          <div :class="$style.viewItemContent">
            <div :class="$style.viewIcon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 3v18" />
              </svg>
            </div>
            <div :class="$style.viewInfo">
              <div :class="$style.viewName">{{ viewName }}</div>
              <div :class="$style.viewMeta">
                <span v-if="view.plane" :class="$style.viewPlane">
                  Plane: {{ view.plane.constant.toFixed(2) }}
                </span>
                <span v-if="view.farPlane" :class="$style.viewFarPlane">
                  FarPlane: {{ view.farPlane.constant.toFixed(2) }}
                </span>
              </div>
              <div :class="$style.viewInputs">
                <div :class="$style.inputGroup">
                  <label :class="$style.inputLabel">Distance:</label>
                  <input
                    :class="$style.input"
                    type="number"
                    :value="distanceValues[viewName] ?? (view.distance ?? 0)"
                    @input="updateDistance(viewName, parseFloat(($event.target as HTMLInputElement).value) || 0)"
                    step="0.1"
                  />
                </div>
                <div :class="$style.inputGroup">
                  <label :class="$style.inputLabel">Range:</label>
                  <input
                    :class="$style.input"
                    type="number"
                    :value="rangeValues[viewName] ?? (view.range ?? 100)"
                    @input="updateRange(viewName, parseFloat(($event.target as HTMLInputElement).value) || 100)"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
            <div
              v-if="activeViewName === viewName"
              :class="$style.activeIndicator"
              title="Активный вид"
            >
              ●
            </div>
          </div>
        </div>
      </div>
    </div>

    <div :class="$style.footer">
      <div :class="$style.footerInfo">
        <span :class="$style.footerText">
          Всего видов: {{ viewsList.length }}
        </span>
        <span v-if="isViewActive" :class="$style.footerActive">
          Активен: {{ activeViewName }}
        </span>
      </div>
    </div>
  </div>
</template>

<style module lang="scss">
.sidebar {
  display: flex;
  flex-direction: column;
  width: 320px;
  height: 100%;
  background: #ffffff;
  border-right: 1px solid #e0e0e0;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.header {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  gap: 12px;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.resetButton {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);

  &:hover:not(.disabled) {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &:active:not(.disabled) {
    transform: translateY(0);
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.resetIcon {
  font-size: 18px;
  line-height: 1;
}

.resetText {
  font-size: 13px;
}

.content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f5f5f5;
  }

  &::-webkit-scrollbar-thumb {
    background: #c0c0c0;
    border-radius: 4px;

    &:hover {
      background: #a0a0a0;
    }
  }
}

.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  color: #666;
}

.emptyText {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.emptyHint {
  margin: 0;
  font-size: 13px;
  color: #999;
  line-height: 1.5;
}

.viewsList {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.viewItem {
  display: flex;
  align-items: center;
  padding: 12px;
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;

  &:hover {
    background: #f0f0f0;
    border-color: #667eea;
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
  }

  &:active {
    transform: translateX(2px);
  }

  &.active {
    background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
    border-color: #667eea;
    box-shadow: 0 2px 12px rgba(102, 126, 234, 0.2);
  }
}

.viewItemContent {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.viewIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 6px;
  color: white;
  flex-shrink: 0;
}

.viewInfo {
  flex: 1;
  min-width: 0;
}

.viewName {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  word-break: break-word;
  line-height: 1.3;
}

.viewMeta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #666;
}

.viewRange {
  color: #888;
}

.viewPlane {
  color: #888;
}

.viewFarPlane {
  color: #888;
}

.viewInputs {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e0e0e0;
}

.inputGroup {
  display: flex;
  align-items: center;
  gap: 8px;
}

.inputLabel {
  font-size: 12px;
  color: #666;
  min-width: 60px;
  font-weight: 500;
}

.input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  font-size: 12px;
  color: #333;
  background: #fff;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
  }

  &:hover {
    border-color: #b0b0b0;
  }
}

.activeIndicator {
  color: #667eea;
  font-size: 12px;
  animation: pulse 2s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.footer {
  padding: 12px 16px;
  background: #f8f9fa;
  border-top: 1px solid #e0e0e0;
}

.footerInfo {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.footerText {
  font-size: 12px;
  color: #666;
}

.footerActive {
  font-size: 12px;
  color: #667eea;
  font-weight: 500;
}
</style>

