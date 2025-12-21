<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import * as OBC from "@thatopen/components";

interface Props {
  viewsComponent: OBC.Views | undefined;
  viewsList: Array<[string, OBC.View]>;
}

const props = defineProps<Props>();

// Храним значения инпутов для каждого view
const distanceValues = ref<Record<string, number>>({});
const rangeValues = ref<Record<string, number>>({});

// Локальные значения для отображения во время ввода (до blur)
const localDistanceValues = ref<Record<string, string>>({});
const localRangeValues = ref<Record<string, string>>({});

// Храним состояние видимости плоскостей для каждого view
const helpersVisibleState = ref<Record<string, boolean>>({});
const planesEnabledState = ref<Record<string, boolean>>({});

// Состояние сворачивания сайдбара
const isCollapsed = ref(false);

/**
 * Переключает состояние сворачивания сайдбара
 */
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

/**
 * Сбрасывает текущий вид, возвращая камеру в 3D режим
 */
const resetView = () => {
  if (!props.viewsComponent) {
    console.warn("Views component is not available");
    return;
  }

  try {
    props.viewsComponent.close();
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
  if (!props.viewsComponent || !viewName) {
    console.warn("Views component or view name is not available");
    return;
  }

  const view = props.viewsComponent.list.get(viewName);
  if (!view) {
    console.warn(`View "${viewName}" not found`);
    return;
  }

  try {
    // Используем сохраненное состояние или значения по умолчанию
    if (viewName in helpersVisibleState.value) {
      view.helpersVisible = helpersVisibleState.value[viewName];
    } else {
      view.helpersVisible = view.helpersVisible ?? true;
      helpersVisibleState.value[viewName] = view.helpersVisible;
    }

    if (viewName in planesEnabledState.value) {
      view.planesEnabled = planesEnabledState.value[viewName];
    } else {
      view.planesEnabled = view.planesEnabled ?? true;
      planesEnabledState.value[viewName] = view.planesEnabled;
    }

    // Используем текущее значение range или значение из инпута
    if (viewName in rangeValues.value) {
      view.range = rangeValues.value[viewName];
    } else if (!view.range) {
      view.range = 100;
    }

    // Открываем вид
    props.viewsComponent.open(viewName);
    view.update();
    console.log(`View "${viewName}" opened`);
  } catch (error) {
    console.error(`Error opening view "${viewName}":`, error);
  }
};

/**
 * Проверяет, открыт ли текущий вид
 */
const isViewActive = computed(() => {
  if (!props.viewsComponent) return false;
  const active = (props.viewsComponent as any).active;
  return active !== null && active !== undefined;
});

/**
 * Получает имя активного вида
 */
const activeViewName = computed(() => {
  if (!props.viewsComponent) return null;
  const active = (props.viewsComponent as any).active;
  if (!active) return null;

  // Ищем имя активного view в списке
  for (const [name, view] of props.viewsList) {
    if (view === active) {
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
    // Инициализируем локальные значения для отображения
    if (!(viewName in localDistanceValues.value)) {
      localDistanceValues.value[viewName] = String(view.distance ?? 0);
    }
    if (!(viewName in localRangeValues.value)) {
      localRangeValues.value[viewName] = String(view.range ?? 100);
    }
  });
};

// Инициализируем значения при изменении списка
watch(
  () => props.viewsList,
  () => {
    initializeInputValues();
    // Инициализируем состояние видимости плоскостей
    props.viewsList.forEach(([viewName, view]) => {
      if (!(viewName in helpersVisibleState.value)) {
        helpersVisibleState.value[viewName] = view.helpersVisible ?? true;
      }
      if (!(viewName in planesEnabledState.value)) {
        planesEnabledState.value[viewName] = view.planesEnabled ?? true;
      }
    });
  },
  { immediate: true }
);

/**
 * Обновляет локальное значение distance при вводе
 */
const updateLocalDistance = (viewName: string, value: string) => {
  localDistanceValues.value[viewName] = value;
};

/**
 * Применяет distance для view при blur
 */
const applyDistance = (viewName: string) => {
  const localValue = localDistanceValues.value[viewName];
  const numValue = parseFloat(localValue) || 0;
  const view = props.viewsComponent?.list.get(viewName);
  if (view) {
    view.distance = numValue;
    distanceValues.value[viewName] = numValue;
    // Синхронизируем локальное значение с примененным
    localDistanceValues.value[viewName] = String(numValue);
  }
};

/**
 * Обновляет локальное значение range при вводе
 */
const updateLocalRange = (viewName: string, value: string) => {
  localRangeValues.value[viewName] = value;
};

/**
 * Применяет range для view при blur
 */
const applyRange = (viewName: string) => {
  const localValue = localRangeValues.value[viewName];
  const numValue = parseFloat(localValue);
  if (isNaN(numValue)) {
    // Если значение невалидное, восстанавливаем предыдущее
    localRangeValues.value[viewName] = String(
      rangeValues.value[viewName] ?? 100
    );
    return;
  }
  const view = props.viewsComponent?.list.get(viewName);
  if (view) {
    view.range = numValue;
    rangeValues.value[viewName] = numValue;
    // Синхронизируем локальное значение с примененным
    localRangeValues.value[viewName] = String(numValue);
  }
};

/**
 * Переключает видимость хелперов (helpersVisible) для view
 */
const toggleHelpersVisible = (viewName: string) => {
  const view = props.viewsComponent?.list.get(viewName);
  if (view) {
    const currentState =
      helpersVisibleState.value[viewName] ?? view.helpersVisible ?? true;
    const newState = !currentState;
    view.helpersVisible = newState;
    helpersVisibleState.value[viewName] = newState;
    view.update();
  }
};

/**
 * Переключает включение плоскостей (planesEnabled) для view
 */
const togglePlanesEnabled = (viewName: string) => {
  const view = props.viewsComponent?.list.get(viewName);
  if (view) {
    const currentState =
      planesEnabledState.value[viewName] ?? view.planesEnabled ?? true;
    const newState = !currentState;
    view.planesEnabled = newState;
    planesEnabledState.value[viewName] = newState;
    view.update();
  }
};
</script>

<template>
  <div :class="[$style.sidebar, { [$style.collapsed]: isCollapsed }]">
    <div :class="$style.header">
      <div :class="$style.headerTop">
        <h3 :class="$style.title" v-if="!isCollapsed">Виды (Views)</h3>
        <div :class="$style.headerActions">
          <button
            v-if="!isCollapsed"
            :class="[$style.resetButton]"
            @click="resetView"
            title="Сбросить вид (вернуться к 3D)"
          >
            <span :class="$style.resetIcon">↺</span>
            <span :class="$style.resetText">Сбросить вид</span>
          </button>
          <button
            :class="$style.collapseButton"
            @click="toggleCollapse"
            :title="isCollapsed ? 'Развернуть сайдбар' : 'Свернуть сайдбар'"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              :class="{ [$style.rotated]: isCollapsed }"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div :class="$style.content" v-if="!isCollapsed">
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
                    :value="
                      localDistanceValues[viewName] ??
                      String(distanceValues[viewName] ?? view.distance ?? 0)
                    "
                    @input="
                      updateLocalDistance(
                        viewName,
                        ($event.target as HTMLInputElement).value
                      )
                    "
                    @blur="applyDistance(viewName)"
                    step="0.1"
                  />
                </div>
                <div :class="$style.inputGroup">
                  <label :class="$style.inputLabel">Range:</label>
                  <input
                    :class="$style.input"
                    type="number"
                    :value="
                      localRangeValues[viewName] ??
                      String(rangeValues[viewName] ?? view.range ?? 100)
                    "
                    @input="
                      updateLocalRange(
                        viewName,
                        ($event.target as HTMLInputElement).value
                      )
                    "
                    @blur="applyRange(viewName)"
                    step="0.1"
                  />
                </div>
                <div :class="$style.planeControls">
                  <button
                    :class="[
                      $style.planeButton,
                      {
                        [$style.active]:
                          helpersVisibleState[viewName] ?? view.helpersVisible,
                      },
                    ]"
                    @click.stop="toggleHelpersVisible(viewName)"
                    :title="
                      helpersVisibleState[viewName] ?? view.helpersVisible
                        ? 'Скрыть хелперы'
                        : 'Показать хелперы'
                    "
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                      />
                    </svg>
                    <span>Хелперы</span>
                  </button>
                  <button
                    :class="[
                      $style.planeButton,
                      {
                        [$style.active]:
                          planesEnabledState[viewName] ?? view.planesEnabled,
                      },
                    ]"
                    @click.stop="togglePlanesEnabled(viewName)"
                    :title="
                      planesEnabledState[viewName] ?? view.planesEnabled
                        ? 'Отключить плоскости'
                        : 'Включить плоскости'
                    "
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 12h18M12 3v18" />
                    </svg>
                    <span>Плоскости</span>
                  </button>
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

    <div :class="$style.footer" v-if="!isCollapsed">
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
  transition: width 0.3s ease;

  &.collapsed {
    width: 60px;
  }
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

.headerTop {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.headerActions {
  display: flex;
  align-items: center;
  gap: 8px;
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

.collapseButton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  flex-shrink: 0;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    transition: transform 0.3s ease;
  }

  .rotated {
    transform: rotate(180deg);
  }
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

.planeControls {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e0e0e0;
}

.planeButton {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 1;
  padding: 8px 12px;
  background: #f5f5f5;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;

  &:hover {
    background: #e8e8e8;
    border-color: #667eea;
    color: #667eea;
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(102, 126, 234, 0.15);
  }

  &:active {
    transform: translateY(0);
  }

  &.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-color: #667eea;
    color: white;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);

    &:hover {
      background: linear-gradient(135deg, #5568d3 0%, #653a91 100%);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
  }

  svg {
    flex-shrink: 0;
  }

  span {
    white-space: nowrap;
  }
}
</style>
