<script lang="ts" setup>
import { computed, ref } from "vue";
import type { ElementData } from "../composables/useViewer";

interface Props {
  elements: ElementData[];
  isLoading?: boolean;
}

const emit = defineEmits<{
  elementClick: [localId: number];
}>();

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
});

// Состояние сворачивания сайдбара
const isCollapsed = ref(false);
const searchQuery = ref("");

/**
 * Переключает состояние сворачивания сайдбара
 */
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

// Фильтруем элементы по поисковому запросу
const filteredElements = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.elements;
  }

  const query = searchQuery.value.toLowerCase().trim();
  return props.elements.filter((element) => {
    const name = element.Name?.toLowerCase() || "";
    const tag = element.Tag?.toLowerCase() || "";
    const objectType = element.ObjectType?.toLowerCase() || "";
    return (
      name.includes(query) || tag.includes(query) || objectType.includes(query)
    );
  });
});

// Очистка поиска
const clearSearch = () => {
  searchQuery.value = "";
};

/**
 * Обработчик клика на элемент
 */
const handleElementClick = (element: ElementData) => {
  emit("elementClick", element.LocalId);
};
</script>

<template>
  <div :class="[$style.sidebar, { [$style.collapsed]: isCollapsed }]">
    <div :class="$style.header">
      <div :class="$style.headerTop">
        <h3 :class="$style.title" v-if="!isCollapsed">Элементы</h3>
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
      <div v-if="!isCollapsed" :class="$style.searchContainer">
        <input
          :class="$style.searchInput"
          type="text"
          placeholder="Поиск по имени..."
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
          :class="$style.elementItem"
          @click="handleElementClick(element)"
        >
          <div :class="$style.elementIcon">
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
          <div :class="$style.elementInfo">
            <div :class="$style.elementName">
              {{ element.Name || `Element ${element.LocalId}` }}
            </div>
            <div :class="$style.elementMeta">
              <span v-if="element.Tag" :class="$style.elementTag">
                Tag: {{ element.Tag }}
              </span>
              <span v-if="element.ObjectType" :class="$style.elementType">
                Type: {{ element.ObjectType }}
              </span>
            </div>
            <div :class="$style.elementDetails">
              <span :class="$style.elementId">ID: {{ element.LocalId }}</span>
              <span v-if="element.Category" :class="$style.elementCategory">
                Category: {{ element.Category }}
              </span>
              <span v-if="element.Comments" :class="$style.elementComments">
                Comments: {{ element.Comments }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div :class="$style.footer" v-if="!isCollapsed">
      <div :class="$style.footerInfo">
        <span :class="$style.footerText">
          Всего: {{ filteredElements.length }}
          <span v-if="searchQuery"> из {{ props.elements.length }} </span>
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
