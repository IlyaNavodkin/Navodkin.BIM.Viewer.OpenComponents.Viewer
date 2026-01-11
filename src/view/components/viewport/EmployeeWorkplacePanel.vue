<script lang="ts" setup>
import { ref } from "vue";
import WorkplaceCard from "./WorkplaceCard.vue";
import type { WorkplaceCardData } from "./WorkplaceCard.vue";
import type { LevelsViewData } from "@/view/components/composables/viewer/data/useDataAccess";

interface Props {
  workplaceCards: WorkplaceCardData[];
  availableLevels: LevelsViewData[];
  selectedLevel: string;
  searchQuery: string;
  occupancyFilter: string;
  selectedLocalId?: number | null;
  isLoading?: boolean;
}

interface Emits {
  (e: "update:selectedLevel", value: string): void;
  (e: "update:searchQuery", value: string): void;
  (e: "update:occupancyFilter", value: string): void;
  (e: "cardClick", localId: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  selectedLocalId: null,
});

const emit = defineEmits<Emits>();

const isCollapsed = ref(false);

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

const handleLevelChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  emit("update:selectedLevel", target.value);
};

const handleSearchInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit("update:searchQuery", target.value);
};

const handleOccupancyChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  emit("update:occupancyFilter", target.value);
};

const handleCardClick = (localId: number) => {
  emit("cardClick", localId);
};
</script>

<template>
  <div
    :class="[$style.panel, { [$style.collapsed]: isCollapsed }]"
    data-workplace-panel
    @mousemove.stop
    @mousedown.stop
    @mouseup.stop
    @click.stop
    @dblclick.stop
    @contextmenu.stop
    @wheel.stop
  >
    <div
      v-if="isCollapsed"
      :class="$style.collapsedPanel"
      @click="toggleCollapse"
      title="Развернуть панель"
    >
      <svg :class="$style.collapsedIcon" viewBox="0 0 24 24" fill="none">
        <path
          d="M9 18L15 12L9 6"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>

    <template v-else>
      <div :class="$style.header" @click="toggleCollapse">
        <span :class="$style.headerTitle">Рабочие места</span>
        <button :class="$style.collapseButton" type="button">
          <span :class="$style.collapseIcon">◀</span>
        </button>
      </div>

      <div :class="$style.content">
        <div :class="$style.filters">
          <div :class="$style.filterGroup">
            <label :class="$style.filterLabel" for="level-select"
              >Уровень</label
            >
            <select
              id="level-select"
              :class="$style.filterSelect"
              :value="props.selectedLevel"
              @change="handleLevelChange"
            >
              <option value="all">Все уровни</option>
              <option
                v-for="level in props.availableLevels"
                :key="level.localId"
                :value="level.name"
              >
                {{ level.name }} (↑ {{ level.elevation.toFixed(2) }}м)
              </option>
            </select>
          </div>

          <div :class="$style.filterGroup">
            <label :class="$style.filterLabel" for="occupancy-select"
              >Статус</label
            >
            <select
              id="occupancy-select"
              :class="$style.filterSelect"
              :value="props.occupancyFilter"
              @change="handleOccupancyChange"
            >
              <option value="all">Показать все</option>
              <option value="occupied">Показать занятые места</option>
              <option value="vacant">Показать свободные места</option>
            </select>
          </div>

          <div :class="$style.filterGroup">
            <label :class="$style.filterLabel" for="search-input">Поиск</label>
            <input
              id="search-input"
              type="text"
              :class="$style.filterInput"
              placeholder="Номер, уровень, имя..."
              :value="props.searchQuery"
              @input="handleSearchInput"
            />
          </div>
        </div>

        <div :class="$style.cardsList">
          <div v-if="props.isLoading" :class="$style.loadingMessage">
            Загрузка...
          </div>

          <div
            v-else-if="props.workplaceCards.length === 0"
            :class="$style.emptyMessage"
          >
            Рабочие места не найдены
          </div>

          <WorkplaceCard
            v-else
            v-for="card in props.workplaceCards"
            :key="card.localId"
            :card="card"
            :is-selected="props.selectedLocalId === card.localId"
            @click="handleCardClick"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<style module lang="scss">
.panel {
  position: absolute;
  top: 10px;
  right: 10px;
  height: calc(100% - 20px);
  max-height: calc(100% - 20px);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  transition: all 0.3s ease;

  &.collapsed {
    width: auto;
  }

  &:not(.collapsed) {
    width: 360px;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    overflow: hidden;
  }
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #667eea;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease;

  &:hover {
    background: #5568d3;
  }
}

.headerTitle {
  font-size: 16px;
  font-weight: 600;
  color: white;
  letter-spacing: 0.3px;
}

.collapseButton {
  background: transparent;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.1);
  }
}

.collapseIcon {
  font-size: 14px;
  color: white;
}

.collapsedPanel {
  width: 40px;
  height: 40px;
  background: #667eea;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: #5568d3;
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
    transform: translateX(-3px) scale(1.05);
  }

  &:active {
    transform: translateX(-2px) scale(0.98);
  }
}

.collapsedIcon {
  width: 20px;
  height: 20px;
  color: white;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  .collapsedPanel:hover & {
    transform: translateX(2px);
  }
}

.content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.filters {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.filterGroup {
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
}

.filterLabel {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filterSelect,
.filterInput {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #1f2937;
  background: white;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  &:hover {
    border-color: #9ca3af;
  }
}

.filterSelect {
  cursor: pointer;
}

.filterInput {
  &::placeholder {
    color: #9ca3af;
  }
}

.cardsList {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;

    &:hover {
      background: #94a3b8;
    }
  }
}

.loadingMessage,
.emptyMessage {
  padding: 32px 16px;
  text-align: center;
  color: #6b7280;
  font-size: 14px;
}
</style>
