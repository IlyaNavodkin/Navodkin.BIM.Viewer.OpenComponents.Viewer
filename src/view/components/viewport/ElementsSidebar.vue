<script lang="ts" setup>
import { computed, ref } from "vue";
import type { ElementData } from "../composables/viewer";
import { useEmployeeStore } from "../../../stores/employee";

interface Props {
  elements: ElementData[];
  isLoading?: boolean;
  selectedElementId?: number | null;
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

// Store для работы с сотрудниками
const employeeStore = useEmployeeStore();

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
  props.elements.forEach((element) => {
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
  let filtered = props.elements;

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
      const placementNumber = getPlacementNumber(element)?.toLowerCase() || "";
      const employee = getEmployeeByPlacement(element);
      const employeeName = employee?.name?.toLowerCase() || "";

      return (
        name.includes(query) ||
        tag.includes(query) ||
        objectType.includes(query) ||
        comments.includes(query) ||
        level.includes(query) ||
        placementNumber.includes(query) ||
        employeeName.includes(query)
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
const handleElementClick = (element: ElementData) => {
  emit("elementClick", element.LocalId);
};

/**
 * Проверяет, является ли элемент выбранным
 */
const isElementSelected = (element: ElementData): boolean => {
  return (
    props.selectedElementId !== null &&
    props.selectedElementId === element.LocalId
  );
};

/**
 * Получает номер места из Comments
 */
const getPlacementNumber = (element: ElementData): string | null => {
  return element.Comments || null;
};

/**
 * Проверяет, занято ли место
 */
const isPlacementOccupied = (element: ElementData): boolean => {
  const placementNumber = getPlacementNumber(element);
  if (!placementNumber) return false;
  const employee = employeeStore.getEmployeeByPlacementId(placementNumber);
  return employee !== undefined;
};

/**
 * Получает информацию о сотруднике, занявшем место
 */
const getEmployeeByPlacement = (element: ElementData) => {
  const placementNumber = getPlacementNumber(element);
  if (!placementNumber) return null;
  return employeeStore.getEmployeeByPlacementId(placementNumber);
};

const handleMouseEnter = (element: ElementData) => {
  emit("elementMouseEnter", element.LocalId);
};

const handleMouseLeave = (element: ElementData) => {
  emit("elementMouseLeave", element.LocalId);
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
      <div v-if="props.isLoading" :class="$style.loadingState">
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

      <div v-else :class="$style.elementsList">
        <div
          v-for="element in filteredElements"
          :key="element.LocalId"
          :class="[
            $style.elementItem,
            { [$style.elementItemActive]: isElementSelected(element) },
          ]"
          @click="handleElementClick(element)"
          @mouseenter="handleMouseEnter(element)"
          @mouseleave="handleMouseLeave(element)"
        >
          <div :class="$style.elementInfo">
            <div :class="$style.elementName">
              Место #
              {{ getPlacementNumber(element) || `Element ${element.LocalId}` }}
            </div>
            <div
              v-if="isPlacementOccupied(element)"
              :class="$style.employeeInfo"
            >
              <div :class="$style.employeeAvatar">
                <img
                  :src="getEmployeeByPlacement(element)?.previewUrlAvatar"
                  :alt="getEmployeeByPlacement(element)?.name"
                />
              </div>
              <div :class="$style.employeeDetails">
                <div :class="$style.employeeName">
                  {{ getEmployeeByPlacement(element)?.name }}
                </div>
                <div :class="$style.employeeStatus">Занято</div>
              </div>
            </div>
            <div v-else :class="$style.placementStatus">
              <span :class="$style.statusFree">Свободно</span>
            </div>
            <div :class="$style.elementDetails">
              <span :class="$style.elementId">ID: {{ element.LocalId }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div :class="$style.footer" v-if="!isCollapsed">
      <div :class="$style.footerInfo">
        <span :class="$style.footerText">
          Всего: {{ filteredElements.length }}
          <span v-if="searchQuery || selectedLevel || hideFree">
            из {{ props.elements.length }}
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

.elementsList {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.elementItem {
  display: flex;
  align-items: flex-start;
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
    transform: translateX(-4px);
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
  }

  &:active {
    transform: translateX(-2px);
  }

  &.elementItemActive {
    background: linear-gradient(
      135deg,
      rgba(102, 126, 234, 0.1) 0%,
      rgba(118, 75, 162, 0.1) 100%
    );
    border: 2px solid #667eea;
    border-left: 4px solid #667eea;
    box-shadow: 0 2px 12px rgba(102, 126, 234, 0.25);

    &:hover {
      background: linear-gradient(
        135deg,
        rgba(102, 126, 234, 0.15) 0%,
        rgba(118, 75, 162, 0.15) 100%
      );
      border-color: #764ba2;
      border-left-color: #764ba2;
    }

    .elementIcon {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    }

    .elementName {
      color: #667eea;
      font-weight: 700;
    }
  }
}

.elementIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 6px;
  color: white;
  flex-shrink: 0;
  margin-right: 12px;
}

.elementInfo {
  flex: 1;
  min-width: 0;
}

.elementName {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  word-break: break-word;
  line-height: 1.3;
}

.elementMeta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 4px;
  font-size: 12px;
  color: #666;
}

.elementTag,
.elementType {
  color: #888;
}

.elementDetails {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  color: #999;
  padding-top: 4px;
  border-top: 1px solid #e0e0e0;
  margin-top: 8px;
}

.employeeInfo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  padding: 8px;
  background: rgba(102, 126, 234, 0.05);
  border-radius: 6px;
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.employeeAvatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid rgba(102, 126, 234, 0.3);
  background: #fff;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.employeeDetails {
  flex: 1;
  min-width: 0;
}

.employeeName {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 2px;
}

.employeeStatus {
  font-size: 11px;
  color: #667eea;
  font-weight: 500;
}

.placementStatus {
  margin-top: 8px;
  padding: 6px 10px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(102, 126, 234, 0.2);
  display: inline-block;
}

.statusFree {
  font-size: 12px;
  color: #667eea;
  font-weight: 600;
}

.elementId,
.elementCategory,
.elementComments {
  color: #aaa;
}

.elementComments {
  font-style: italic;
  color: #888;
  margin-top: 4px;
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
