<script lang="ts" setup>
import { ref, computed, watch, type ShallowRef } from "vue";
import * as THREE from "three";
import type { LevelsViewData } from "../composables/viewer/data/useDataAccess";
import type { useClipStyler } from "../composables/viewer/features/useClip";

interface Props {
  levelsData: LevelsViewData[] | { value: LevelsViewData[] };
  isLoadingLevels: boolean | { value: boolean };
}

const props = defineProps<Props>();

// Разворачиваем ref/computed для использования в компоненте
const levelsData = computed(() => {
  const value = props.levelsData;
  return Array.isArray(value) ? value : value.value;
});

const isLoadingLevels = computed(() => {
  const value = props.isLoadingLevels;
  return typeof value === "boolean" ? value : value.value;
});

const emit = defineEmits<{
  (e: "toggleLevelClip", levelName: string): void;
}>();

const isCollapsed = ref(false);

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

const toggleLevelClip = (levelName: string) => {
  emit("toggleLevelClip", levelName);
};
</script>

<template>
  <div :class="[$style.sidebar, { [$style.collapsed]: isCollapsed }]">
    <div :class="$style.header">
      <div :class="$style.headerTop">
        <h3 :class="$style.title" v-if="!isCollapsed">3D Клиппер</h3>
        <div :class="$style.headerActions">
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
      <div v-if="isLoadingLevels" :class="$style.loadingState">
        <p :class="$style.loadingText">Загрузка уровней...</p>
      </div>

      <div v-else-if="levelsData.length === 0" :class="$style.emptyState">
        <p :class="$style.emptyText">Нет доступных уровней</p>
        <p :class="$style.emptyHint">
          Загрузите IFC модель с этажами (IfcBuildingStorey)
        </p>
      </div>

      <div v-else :class="$style.levelsList">
        <div
          v-for="level in levelsData"
          :key="level.name"
          :class="[$style.levelItem]"
        >
          <div :class="$style.levelItemContent">
            <div :class="$style.levelIcon">
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
            <div :class="$style.levelInfo">
              <div :class="$style.levelName">{{ level.name }}</div>
              <div :class="$style.levelMeta">
                <span :class="$style.levelElevation">
                  Высота: {{ level.elevation.toFixed(2) }}
                </span>
              </div>
            </div>
            <div :class="$style.levelControls">
              <button
                :class="[$style.clipButton]"
                @click.stop="toggleLevelClip(level.name)"
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
                    d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
                  />
                </svg>
                <span>Клип</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div :class="$style.footer" v-if="!isCollapsed">
      <div :class="$style.footerInfo">
        <span :class="$style.footerText">
          Всего уровней: {{ levelsData.length }}
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
  background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
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

.clearButton {
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

.clearIcon {
  font-size: 18px;
  line-height: 1;
}

.clearText {
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

.loadingState {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.loadingText {
  margin: 0;
  font-size: 14px;
  color: #666;
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

.levelsList {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.levelItem {
  display: flex;
  align-items: center;
  padding: 12px;
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.2s ease;
  user-select: none;

  &:hover {
    background: #f0f0f0;
    border-color: #4caf50;
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.15);
  }

  &.active {
    background: linear-gradient(135deg, #4caf5015 0%, #2e7d3215 100%);
    border-color: #4caf50;
    box-shadow: 0 2px 12px rgba(76, 175, 80, 0.2);
  }
}

.levelItemContent {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.levelIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
  border-radius: 6px;
  color: white;
  flex-shrink: 0;
}

.levelInfo {
  flex: 1;
  min-width: 0;
}

.levelName {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  word-break: break-word;
  line-height: 1.3;
}

.levelMeta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #666;
}

.levelElevation {
  color: #888;
}

.levelControls {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.clipButton {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
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
    border-color: #4caf50;
    color: #4caf50;
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(76, 175, 80, 0.15);
  }

  &:active {
    transform: translateY(0);
  }

  &.active {
    background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
    border-color: #4caf50;
    color: white;
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);

    &:hover {
      background: linear-gradient(135deg, #43a047 0%, #1b5e20 100%);
      box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
    }
  }

  svg {
    flex-shrink: 0;
  }

  span {
    white-space: nowrap;
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
  color: #4caf50;
  font-weight: 500;
}
</style>
