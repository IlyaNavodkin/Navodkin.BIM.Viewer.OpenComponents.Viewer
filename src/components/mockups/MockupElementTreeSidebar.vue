<template>
  <div class="sidebar-panel">
    <div class="sidebar-header">
      <div>
        <div class="sidebar-title">Дерево элементов</div>
        <div class="sidebar-subtitle">Компактная навигация по модели</div>
        <span class="sidebar-subtitle-hint">
          Click / Ctrl + Click / Shift + Click / Ctrl + Shift + Click
        </span>
      </div>
      <q-chip square dense class="count-chip">
        {{ visibleNodeCount }} узлов
      </q-chip>
    </div>

    <q-input
      v-model="searchTerm"
      dense
      outlined
      clearable
      placeholder="Поиск по названию элемента"
      class="search-input"
    >
      <template #prepend>
        <q-icon name="search" />
      </template>
    </q-input>

    <div v-if="filteredTree.length" class="tree-scroll">
      <MockupElementTreeNode
        v-for="node in filteredTree"
        :key="node.id"
        :depth="0"
        :expanded-ids="expandedNodeIds"
        :force-expand="forceExpandAll"
        :highlighted-ids="highlightedElementIds"
        :node="node"
        :selected-id="selectedElementId"
        @copy-id="copyElementId"
        @copy-name="copyElementName"
        @focus="focusElement"
        @select="handleSelect"
        @toggle-expand="toggleExpanded"
      />
    </div>

    <q-banner v-else rounded class="empty-banner">
      {{
        searchTerm
          ? "Ничего не найдено по текущему запросу."
          : "Модели пока не загружены."
      }}
    </q-banner>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useMockupWorkspace } from "../../composables/mockups/useMockupWorkspace";
import type { MockupTreeNode } from "../../types/mockups";
import MockupElementTreeNode from "./MockupElementTreeNode.vue";

const searchTerm = ref("");
const expandedNodeIds = ref<string[]>([]);

const {
  copyElementId,
  copyElementName,
  focusElement,
  highlightedElementIds,
  selectElement,
  selectedElementId,
  treeRoots,
} = useMockupWorkspace();

const forceExpandAll = computed(() => Boolean(searchTerm.value.trim()));
const filteredTree = computed(() => filterTree(treeRoots.value, searchTerm.value));
const visibleNodeIds = computed(() =>
  flattenVisibleNodeIds(filteredTree.value, expandedNodeIds.value, forceExpandAll.value)
);
const visibleNodeCount = computed(() => visibleNodeIds.value.length);

watch(
  treeRoots,
  (nodes) => {
    expandedNodeIds.value = uniqueIds([
      ...collectDefaultExpandedIds(nodes),
      ...expandedNodeIds.value.filter((id) => containsNodeId(nodes, id)),
    ]);
  },
  { immediate: true }
);

function handleSelect(nodeId: string, event: MouseEvent) {
  selectElement(nodeId, visibleNodeIds.value, event);
}

function toggleExpanded(nodeId: string) {
  if (expandedNodeIds.value.includes(nodeId)) {
    expandedNodeIds.value = expandedNodeIds.value.filter((item) => item !== nodeId);
    return;
  }

  expandedNodeIds.value = [...expandedNodeIds.value, nodeId];
}

function filterTree(nodes: MockupTreeNode[], term: string): MockupTreeNode[] {
  const normalized = term.trim().toLowerCase();

  if (!normalized) {
    return nodes;
  }

  return nodes
    .map((node) => {
      const filteredChildren = filterTree(node.children, term);
      const matches = node.label.toLowerCase().includes(normalized);

      if (matches || filteredChildren.length) {
        return {
          ...node,
          children: filteredChildren,
        };
      }

      return null;
    })
    .filter((node): node is MockupTreeNode => Boolean(node));
}

function flattenVisibleNodeIds(
  nodes: MockupTreeNode[],
  expandedIds: string[],
  forceExpand: boolean
): string[] {
  const visibleIds: string[] = [];

  const visit = (branch: MockupTreeNode[]) => {
    for (const node of branch) {
      visibleIds.push(node.id);

      if (
        node.children.length &&
        (forceExpand || expandedIds.includes(node.id))
      ) {
        visit(node.children);
      }
    }
  };

  visit(nodes);
  return visibleIds;
}

function collectDefaultExpandedIds(
  nodes: MockupTreeNode[],
  depth = 0
): string[] {
  return nodes.flatMap((node) => {
    if (!node.children.length) {
      return [];
    }

    const nestedIds = collectDefaultExpandedIds(node.children, depth + 1);
    return depth < 2 ? [node.id, ...nestedIds] : nestedIds;
  });
}

function containsNodeId(nodes: MockupTreeNode[], nodeId: string): boolean {
  return nodes.some(
    (node) => node.id === nodeId || containsNodeId(node.children, nodeId)
  );
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}
</script>

<style scoped>
.sidebar-panel {
  height: 100%;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
}

.sidebar-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--ds-color-text-primary);
}

.sidebar-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ds-color-text-secondary);
}

.sidebar-subtitle-hint {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: var(--ds-color-text-muted);
}

.count-chip {
  background: var(--ds-color-bg-surface-muted);
  color: var(--ds-color-text-secondary);
}

.search-input :deep(.q-field__control) {
  border-radius: 12px;
}

.search-input :deep(.q-field__native),
.search-input :deep(.q-field__prepend) {
  font-size: 12px;
}

.tree-scroll {
  overflow: auto;
  padding-right: 4px;
}

.empty-banner {
  background: var(--ds-color-bg-surface-muted);
  color: var(--ds-color-text-primary);
}
</style>
