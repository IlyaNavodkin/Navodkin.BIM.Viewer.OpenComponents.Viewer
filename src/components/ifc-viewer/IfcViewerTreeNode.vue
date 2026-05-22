<template>
  <div :class="$style.node">
    <div :class="$style.row">
      <button
        v-if="node.childCount > 0"
        :class="$style.chevronButton"
        type="button"
        @click="emit('toggle-node', node.modelId, node.id)"
      >
        {{ node.isExpanded ? "v" : ">" }}
      </button>
      <span v-else :class="$style.chevronPlaceholder" />

      <button
        :class="[
          $style.labelButton,
          selectedElementId === selectedElementKey ? $style.labelButtonActive : '',
        ]"
        type="button"
        @click="onLabelClick"
      >
        {{ node.label }}
      </button>

      <span :class="$style.meta" v-if="node.childCount > 0">{{ node.childCount }}</span>
    </div>

    <div :class="$style.children" v-if="node.isExpanded && node.children.length > 0">
      <IfcViewerTreeNode
        v-for="childNode in node.children"
        :key="childNode.id"
        :node="childNode"
        :selected-element-id="selectedElementId"
        @toggle-node="onToggleNode"
        @select-element="onSelectElement"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { IfcViewerTreeNode } from "../../types/ifcViewer";

export interface IIfcViewerTreeNodeProps {
  node: IfcViewerTreeNode;
  selectedElementId: string | null;
}

const props = defineProps<IIfcViewerTreeNodeProps>();

const emit = defineEmits<{
  (event: "toggle-node", modelId: string, nodeId: string): void;
  (event: "select-element", modelId: string, localId: number): void;
}>();

const selectedElementKey = computed(() => {
  if (props.node.localId === null) {
    return null;
  }

  return `${props.node.modelId}:${props.node.localId}`;
});

const onLabelClick = () => {
  if (props.node.localId !== null) {
    emit("select-element", props.node.modelId, props.node.localId);
    return;
  }

  if (props.node.childCount > 0) {
    emit("toggle-node", props.node.modelId, props.node.id);
  }
};

const onToggleNode = (modelId: string, nodeId: string) => {
  emit("toggle-node", modelId, nodeId);
};

const onSelectElement = (modelId: string, localId: number) => {
  emit("select-element", modelId, localId);
};
</script>

<style module>
.node {
  display: grid;
  gap: 6px;
}

.row {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}

.chevronButton,
.labelButton {
  border: 0;
  background: transparent;
  cursor: pointer;
  font: inherit;
}

.chevronButton {
  width: 18px;
  height: 18px;
  padding: 0;
  color: var(--ds-color-text-secondary);
}

.chevronPlaceholder {
  width: 18px;
  height: 18px;
}

.labelButton {
  min-height: 32px;
  padding: 6px 8px;
  border-radius: 10px;
  text-align: left;
  color: var(--ds-color-text-secondary);
  word-break: break-word;
}

.labelButton:hover {
  background: var(--ds-color-bg-surface-muted);
}

.labelButtonActive {
  background: color-mix(in srgb, var(--ds-color-brand-500) 10%, white);
  color: var(--ds-color-text-primary);
}

.meta {
  color: var(--ds-color-text-muted);
  font-size: 11px;
  font-weight: 600;
}

.children {
  margin-left: 18px;
  padding-left: 8px;
  border-left: 1px solid var(--ds-color-border-default);
  display: grid;
  gap: 6px;
}
</style>
