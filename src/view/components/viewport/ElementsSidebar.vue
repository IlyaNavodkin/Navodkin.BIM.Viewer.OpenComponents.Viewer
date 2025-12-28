<script lang="ts" setup>
import { computed, ref } from "vue";
import type { ElementData } from "../composables/viewer";
import { useElementFilter } from "../composables/viewer/features/useElementFilter";
import WorkplaceList from "./WorkplaceList.vue";

interface Props {
  elements: ElementData[] | { value: ElementData[] };
  isLoading?: boolean | { value: boolean };
  selectedElementId?: number | null | { value: number | null };
}

const emit = defineEmits<{
  elementClick: [localId: number];
  elementMouseEnter: [localId: number];
  elementMouseLeave: [localId: number];
}>();

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  selectedElementId: null,
});

// Разворачиваем ref/computed для использования в компоненте
const elements = computed(() => {
  const value = props.elements;
  return Array.isArray(value) ? value : value.value;
});

const isLoading = computed(() => {
  const value = props.isLoading ?? false;
  return typeof value === "boolean" ? value : value.value;
});

const selectedElementId = computed(() => {
  const value = props.selectedElementId ?? null;
  return value === null || typeof value === "number" ? value : value.value;
});

// Используем методы из composable для работы с сотрудниками
const { isPlacementOccupied } = useElementFilter();

// Состояние сворачивания сайдбара
const isCollapsed = ref(false);
const searchQuery = ref("");
const selectedLevel = ref<string | null>(null);
const hideFree = ref(false);

/**
 * Переключает состояние сворачивания сайдбара
 */
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

// Очистка поиска
const clearSearch = () => {
  searchQuery.value = "";
};

/**
 * Получает список уникальных уровней из элементов
 */
const availableLevels = computed(() => {
  const levels = new Set<string>();
  elements.value.forEach((element) => {
    if (element.Level) {
      levels.add(element.Level);
    }
  });
  return Array.from(levels).sort();
});

/**
 * Сравнивает два значения для сортировки (числовая или строковая)
 */
const compareValues = (a: string | null, b: string | null): number => {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  // Пытаемся извлечь числа из строк
  const numA = parseFloat(a.trim());
  const numB = parseFloat(b.trim());

  // Если оба значения - числа, сортируем численно
  if (!isNaN(numA) && !isNaN(numB)) {
    return numA - numB;
  }

  // Иначе сортируем строково
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
};

// Фильтруем элементы по поисковому запросу и выбранному уровню
const filteredElements = computed(() => {
  let filtered = elements.value;

  // Фильтрация по уровню
  if (selectedLevel.value) {
    filtered = filtered.filter(
      (element) => element.Level === selectedLevel.value
    );
  }

  // Фильтрация по статусу занятости (скрыть свободные)
  if (hideFree.value) {
    filtered = filtered.filter((element) => isPlacementOccupied(element));
  }

  // Фильтрация по поисковому запросу
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim();
    filtered = filtered.filter((element) => {
      const name = element.Name?.toLowerCase() || "";
      const tag = element.Tag?.toLowerCase() || "";
      const objectType = element.ObjectType?.toLowerCase() || "";
      const comments = element.Comments?.toLowerCase() || "";
      const level = element.Level?.toLowerCase() || "";
      const placementNumber = element.Comments?.toLowerCase() || "";

      return (
        name.includes(query) ||
        tag.includes(query) ||
        objectType.includes(query) ||
        comments.includes(query) ||
        level.includes(query) ||
        placementNumber.includes(query)
      );
    });
  }

  // Сортировка: сначала по Level, затем по Comments (номеру места)
  filtered = [...filtered].sort((a, b) => {
    // Сначала сортируем по Level
    const levelCompare = compareValues(a.Level, b.Level);
    if (levelCompare !== 0) {
      return levelCompare;
    }

    // Если Level одинаковый или оба null, сортируем по Comments
    return compareValues(a.Comments, b.Comments);
  });

  return filtered;
});

/**
 * Обработчик клика на элемент
 */
const handleElementClick = (localId: number) => {
  emit("elementClick", localId);
};

/**
 * Обработчик наведения мыши на элемент
 */
const handleElementMouseEnter = (localId: number) => {
  emit("elementMouseEnter", localId);
};

/**
 * Обработчик ухода мыши с элемента
 */
const handleElementMouseLeave = (localId: number) => {
  emit("elementMouseLeave", localId);
};
</script>

<template>
  <div :class="[$style.sidebar, { [$style.collapsed]: isCollapsed }]">
    <div :class="$style.header">
      <div :class="$style.headerTop">
        <h3 :class="$style.title" v-if="!isCollapsed">Рабочие места</h3>
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
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>
      <div v-if="!isCollapsed" :class="$style.filtersContainer">
        <select
          :class="$style.levelSelect"
          v-model="selectedLevel"
          title="Фильтр по этажу"
        >
          <option :value="null">Все этажи</option>
          <option v-for="level in availableLevels" :key="level" :value="level">
            {{ level }}
          </option>
        </select>
        <label :class="$style.checkboxLabel">
          <input type="checkbox" v-model="hideFree" :class="$style.checkbox" />
          <span :class="$style.checkboxText">Скрыть свободные</span>
        </label>
        <div :class="$style.searchContainer">
          <input
            :class="$style.searchInput"
            type="text"
            placeholder="Поиск по месту, номеру, сотруднику..."
            v-model="searchQuery"
          />
          <button
            v-if="searchQuery"
            :class="$style.clearButton"
            @click="clearSearch"
            title="Очистить поиск"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div :class="$style.content" v-if="!isCollapsed">
      <div v-if="isLoading" :class="$style.loadingState">
        <p :class="$style.loadingText">Загрузка элементов...</p>
      </div>

      <div v-else-if="filteredElements.length === 0" :class="$style.emptyState">
        <p :class="$style.emptyText">
          {{ searchQuery ? "Элементы не найдены" : "Нет доступных элементов" }}
        </p>
        <p :class="$style.emptyHint" v-if="!searchQuery">
          Загрузите IFC модель с элементами IFCWALLSTANDARDCASE
        </p>
      </div>

      <WorkplaceList
        v-else
        :elements="filteredElements"
        :selectedElementId="selectedElementId"
        @elementClick="handleElementClick"
        @elementMouseEnter="handleElementMouseEnter"
        @elementMouseLeave="handleElementMouseLeave"
      />
    </div>

    <div :class="$style.footer" v-if="!isCollapsed">
      <div :class="$style.footerInfo">
        <span :class="$style.footerText">
          Всего: {{ filteredElements.length }}
          <span v-if="searchQuery || selectedLevel || hideFree">
            из {{ elements.length }}
          </span>
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
  border-left: 1px solid #e0e0e0;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.05);
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

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.5px;
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

.filtersContainer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.levelSelect {
  width: 100%;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: white;
  font-size: 14px;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='white' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;

  option {
    background: #667eea;
    color: white;
  }

  &:focus {
    outline: none;
    background-color: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
  }

  &:hover {
    background-color: rgba(255, 255, 255, 0.25);
  }
}

.checkboxLabel {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.35);
  }
}

.checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: white;
  flex-shrink: 0;
}

.checkboxText {
  font-size: 13px;
  color: white;
  font-weight: 500;
}

.searchContainer {
  position: relative;
  display: flex;
  align-items: center;
}

.searchInput {
  width: 100%;
  padding: 10px 36px 10px 12px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: white;
  font-size: 14px;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;

  &::placeholder {
    color: rgba(255, 255, 255, 0.7);
  }

  &:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
  }
}

.clearButton {
  position: absolute;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: white;
    transform: scale(1.1);
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
</style>
