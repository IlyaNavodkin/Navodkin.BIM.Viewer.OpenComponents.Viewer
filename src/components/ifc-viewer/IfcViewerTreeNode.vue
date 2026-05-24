<template>
  <div :class="$style.node">
    <div :class="$style.row">
      <button
        v-if="node.childCount > 0"
        :class="$style.chevronButton"
        type="button"
        @click.stop="emit('toggle-node', node.modelId, node.id)"
      >
        {{ isExpanded ? "v" : ">" }}
      </button>
      <span v-else :class="$style.chevronPlaceholder" />

      <button
        :class="[
          $style.labelButton,
          isSelected ? $style.labelButtonActive : '',
        ]"
        type="button"
        @click="onLabelClick"
        @dblclick.stop="emit('focus-node', node)"
        @contextmenu.prevent.stop="emit('context-menu', node, $event)"
      >
        <span :class="$style.labelMain">
          <span :class="$style.labelHeader">
            <q-icon :name="iconName" size="14px" :class="$style.labelIcon" />
            <span :class="$style.labelText">{{ node.label }}</span>
          </span>
          <span v-if="node.ifcCategory" :class="$style.categoryTag">
            {{ node.ifcCategory }}
          </span>
        </span>
        <span v-if="node.childCount > 0" :class="$style.meta">{{ node.childCount }}</span>
      </button>
    </div>

    <div v-if="isExpanded && node.children.length > 0" :class="$style.children">
      <IfcViewerTreeNode
        v-for="childNode in node.children"
        :key="childNode.id"
        :node="childNode"
        :active-node-id="activeNodeId"
        :highlighted-node-ids="highlightedNodeIds"
        :force-expand="forceExpand"
        @toggle-node="onToggleNode"
        @select-node="onSelectNode"
        @focus-node="onFocusNode"
        @context-menu="onContextMenu"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { IfcViewerTreeNode as IfcTreeNode } from "../../types/ifcViewer";

export interface IIfcViewerTreeNodeProps {
  node: IfcTreeNode;
  activeNodeId: string | null;
  highlightedNodeIds: string[];
  forceExpand?: boolean;
}

const props = withDefaults(defineProps<IIfcViewerTreeNodeProps>(), {
  forceExpand: false,
});

const emit = defineEmits<{
  (event: "toggle-node", modelId: string, nodeId: string): void;
  (event: "select-node", node: IfcTreeNode, mouseEvent: MouseEvent): void;
  (event: "focus-node", node: IfcTreeNode): void;
  (event: "context-menu", node: IfcTreeNode, mouseEvent: MouseEvent): void;
}>();

const isExpanded = computed(() => props.forceExpand || props.node.isExpanded);
const isSelected = computed(
  () =>
    props.activeNodeId === props.node.id ||
    props.highlightedNodeIds.includes(props.node.id)
);
const iconName = computed(() => {
  const category = props.node.ifcCategory?.toLowerCase() ?? "";

  if (props.node.localId === null && !category) {
    return "layers";
  }

  if (
    category.includes("storey") ||
    category.includes("buildingstorey") ||
    category.includes("level")
  ) {
    return "apartment";
  }

  if (category.includes("space")) {
    return "grid_view";
  }

  if (props.node.childCount > 0) {
    return "account_tree";
  }

  return "category";
});

const onLabelClick = (mouseEvent: MouseEvent) => {
  emit("select-node", props.node, mouseEvent);
};

const onToggleNode = (modelId: string, nodeId: string) => {
  emit("toggle-node", modelId, nodeId);
};

const onSelectNode = (node: IfcTreeNode, mouseEvent: MouseEvent) => {
  emit("select-node", node, mouseEvent);
};

const onFocusNode = (node: IfcTreeNode) => {
  emit("focus-node", node);
};

const onContextMenu = (node: IfcTreeNode, mouseEvent: MouseEvent) => {
  emit("context-menu", node, mouseEvent);
};
</script>

<style module>
.node {
  display: grid;
  gap: 4px;
}

.row {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  align-items: start;
  gap: 6px;
}

.chevronButton,
.labelButton {
  border: 0;
  background: transparent;
  cursor: pointer;
  font: inherit;
}

.chevronButton {
  width: 16px;
  height: 16px;
  padding: 0;
  color: var(--ds-color-text-secondary);
  font-size: 11px;
}

.chevronPlaceholder {
  width: 16px;
  height: 16px;
}

.labelButton {
  min-height: 28px;
  padding: 5px 8px;
  border-radius: 10px;
  text-align: left;
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 8px;
  color: var(--ds-color-text-secondary);
}

.labelButton:hover {
  background: rgba(238, 243, 249, 0.88);
}

.labelButtonActive {
  background: color-mix(in srgb, var(--ds-color-brand-500) 10%, white);
  color: var(--ds-color-text-primary);
}

.labelMain {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.labelHeader {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 5px;
  align-items: start;
}

.labelIcon {
  color: var(--ds-color-text-secondary);
  margin-top: 0;
}

.labelText {
  color: inherit;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.25;
  word-break: break-word;
}

.categoryTag {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  padding: 3px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  color: var(--ds-color-text-muted);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.meta {
  flex: 0 0 auto;
  color: var(--ds-color-text-muted);
  font-size: 10px;
  font-weight: 700;
}

.children {
  margin-left: 0;
  padding-left: 0;
  display: grid;
  gap: 4px;
}
</style>
