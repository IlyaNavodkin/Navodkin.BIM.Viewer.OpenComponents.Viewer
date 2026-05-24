<template>
  <div class="tree-branch">
    <div
      class="tree-row"
      :style="{ paddingLeft: `${depth * 12 + 6}px` }"
      @click="emit('select', node.id, $event)"
      @dblclick="emit('focus', node.id)"
    >
      <q-btn
        v-if="hasChildren"
        :icon="isExpanded ? 'expand_more' : 'chevron_right'"
        flat
        round
        dense
        size="8px"
        class="toggle-button"
        @click.stop="emit('toggle-expand', node.id)"
      />
      <div v-else class="toggle-placeholder" />

      <div
        class="node-content"
        :class="{
          'node-content-selected':
            selectedId === node.id || highlightedIds.includes(node.id),
        }"
        @contextmenu="emit('select', node.id, $event)"
      >
        <q-icon :name="iconName" size="14px" class="node-icon" />
        <span class="node-label">{{ node.label }}</span>

        <q-menu context-menu touch-position>
          <q-list dense style="min-width: 180px">
            <q-item clickable v-close-popup @click="emit('copy-id', node.id)">
              <q-item-section avatar>
                <q-icon name="content_copy" />
              </q-item-section>
              <q-item-section>Копировать айди</q-item-section>
            </q-item>

            <q-item clickable v-close-popup @click="emit('copy-name', node.id)">
              <q-item-section avatar>
                <q-icon name="badge" />
              </q-item-section>
              <q-item-section>Копировать имя</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </div>
    </div>

    <div v-if="isExpanded && hasChildren" class="branch-children">
      <MockupElementTreeNode
        v-for="child in node.children"
        :key="child.id"
        :depth="depth + 1"
        :expanded-ids="expandedIds"
        :force-expand="forceExpand"
        :highlighted-ids="highlightedIds"
        :node="child"
        :selected-id="selectedId"
        @copy-id="emit('copy-id', $event)"
        @copy-name="emit('copy-name', $event)"
        @focus="emit('focus', $event)"
        @select="(nodeId, event) => emit('select', nodeId, event)"
        @toggle-expand="emit('toggle-expand', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { MockupTreeNode } from "../../types/mockups";

defineOptions({
  name: "MockupElementTreeNode",
});

const props = defineProps<{
  depth: number;
  expandedIds: string[];
  forceExpand: boolean;
  highlightedIds: string[];
  node: MockupTreeNode;
  selectedId: string | null;
}>();

const emit = defineEmits<{
  "copy-id": [nodeId: string];
  "copy-name": [nodeId: string];
  focus: [nodeId: string];
  select: [nodeId: string, event: MouseEvent];
  "toggle-expand": [nodeId: string];
}>();

const hasChildren = computed(() => props.node.children.length > 0);
const isExpanded = computed(
  () => props.forceExpand || props.expandedIds.includes(props.node.id)
);
const iconName = computed(() => {
  if (props.node.type === "MODEL") {
    return "layers";
  }

  if (props.node.type === "LEVEL") {
    return "apartment";
  }

  if (props.node.type === "SPACE") {
    return "grid_view";
  }

  return "category";
});
</script>

<style scoped>
.tree-row {
  min-height: 24px;
  display: flex;
  align-items: center;
  color: var(--ds-color-text-primary);
  user-select: none;
  -webkit-user-select: none;
}

.toggle-button {
  min-width: 18px;
  min-height: 18px;
  color: var(--ds-color-text-muted);
}

.toggle-placeholder {
  width: 18px;
}

.node-content {
  min-height: 24px;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px 3px 6px;
  border-radius: 8px;
  cursor: default;
  transition:
    background-color 0.18s ease,
    box-shadow 0.18s ease;
  user-select: none;
  -webkit-user-select: none;
}

.tree-row:hover .node-content {
  background: rgba(25, 118, 210, 0.08);
}

.node-content-selected {
  background: rgba(25, 118, 210, 0.14);
  box-shadow: inset 0 0 0 1px rgba(25, 118, 210, 0.18);
}

.node-icon {
  color: var(--ds-color-text-secondary);
}

.node-label {
  font-size: 12px;
  line-height: 1.2;
  letter-spacing: -0.01em;
}
</style>
