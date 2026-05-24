<template>
  <aside :class="$style.sidebar">
    <div :class="$style.sidebarHeader">
      <div>
        <div :class="$style.sidebarTitle">Model Explorer</div>
        <div :class="$style.sidebarSubtitle">
          {{ projectName }}
        </div>
        <span :class="$style.sidebarHint">
          Browse loaded IFC models, expand categories, and focus elements.
        </span>
      </div>
      <div :class="$style.countChip">
        {{ visibleNodeCount }} nodes
      </div>
    </div>

    <div :class="$style.sidebarControls">
      <label :class="$style.searchField">
        <q-icon name="search" size="14px" :class="$style.searchIcon" />
        <input
          v-model="searchTerm"
          :class="$style.searchInput"
          type="search"
          placeholder="Search model, category, or element"
        />
      </label>

      <button :class="$style.uploadButton" type="button" @click="onUploadClick">
        Upload IFC
      </button>
    </div>

    <input
      ref="fileInputElement"
      :class="$style.hiddenInput"
      accept=".ifc"
      multiple
      type="file"
      @change="onFileInputChange"
    />

    <div v-if="filteredModels.length" :class="$style.sidebarBody">
      <section
        v-for="model in filteredModels"
        :key="model.id"
        :class="$style.modelCard"
        @contextmenu.prevent.stop="
          emit('model-context-menu', {
            x: $event.clientX,
            y: $event.clientY,
            modelId: model.id,
          })
        "
      >
        <div :class="$style.modelToolbar">
          <button
            :class="$style.modelButton"
            type="button"
            @click="emit('toggle-model', model.id)"
          >
            <span :class="$style.modelButtonMain">
              <span :class="$style.chevron">
                {{ forceExpandAll || model.isExpanded ? "v" : ">" }}
              </span>
              <span>
                <span :class="$style.modelName">{{ model.name }}</span>
                <span :class="$style.modelMeta">{{ model.sourceFileName }}</span>
              </span>
            </span>

            <span :class="$style.modelStats">
              <span>{{ model.categoryCount }} groups</span>
              <span>{{ model.elementCount }} el.</span>
            </span>
          </button>

          <button
            :class="$style.deleteButton"
            type="button"
            title="Delete model"
            @click.stop="emit('delete-model', model.id)"
          >
            Remove
          </button>
        </div>

        <div v-if="forceExpandAll || model.isExpanded" :class="$style.modelChildren">
          <IfcViewerTreeNode
            v-for="rootNode in model.rootNodes"
            :key="rootNode.id"
            :node="rootNode"
            :active-node-id="selectionState.activeTreeNodeId"
            :highlighted-node-ids="selectionState.highlightedTreeNodeIds"
            :force-expand="forceExpandAll"
            @toggle-node="onToggleNode"
            @select-node="onSelectNode"
            @focus-node="onFocusNode"
            @context-menu="onTreeNodeContextMenu"
          />
        </div>
      </section>
    </div>

    <div :class="$style.emptyState" v-else>
      <div :class="$style.emptyBadge">
        {{ searchTerm.trim() ? "No matches" : "Empty workspace" }}
      </div>
      <div :class="$style.emptyTitle">
        {{ searchTerm.trim() ? "Nothing matched the current filter" : "Start with IFC files" }}
      </div>
      <div :class="$style.emptyText">
        {{
          searchTerm.trim()
            ? "Try another file name, category, or element label."
            : "Upload one or more IFC models to populate the explorer and activate selection workflows."
        }}
      </div>
      <button :class="$style.emptyUploadButton" type="button" @click="onUploadClick">
        Choose IFC Files
      </button>
    </div>

    <div
      v-if="contextMenu.isVisible && contextMenu.modelId"
      :class="$style.contextMenu"
      :style="{
        left: `${contextMenu.x}px`,
        top: `${contextMenu.y}px`,
      }"
      @click.stop
    >
      <button
        :class="$style.contextMenuButton"
        type="button"
        @click="emit('delete-model', contextMenu.modelId)"
      >
        Delete model
      </button>
    </div>

    <div
      v-if="treeContextMenu"
      :class="$style.contextMenu"
      :style="{
        left: `${treeContextMenu.x}px`,
        top: `${treeContextMenu.y}px`,
      }"
      @click.stop
    >
      <button
        :class="$style.contextMenuButton"
        type="button"
        @click="onCopyTreeNodeId"
      >
        {{ treeContextMenu.localId !== null ? "Copy element ID" : "Copy node ID" }}
      </button>
      <button
        :class="$style.contextMenuButton"
        type="button"
        @click="onCopyTreeNodeName"
      >
        Copy element name
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import IfcViewerTreeNode from "./IfcViewerTreeNode.vue";
import type {
  IfcViewerContextMenuState,
  IfcViewerModelTreeNode,
  IfcViewerSelectionState,
  IfcViewerTreeNode as IfcTreeNode,
} from "../../types/ifcViewer";

export interface IIfcViewerSidebarProps {
  projectName: string;
  models: IfcViewerModelTreeNode[];
  selectionState: IfcViewerSelectionState;
  contextMenu: IfcViewerContextMenuState;
}

const props = defineProps<IIfcViewerSidebarProps>();

const emit = defineEmits<{
  (event: "files-selected", files: File[]): void;
  (
    event: "model-context-menu",
    payload: { x: number; y: number; modelId: string },
  ): void;
  (event: "toggle-model", modelId: string): void;
  (event: "toggle-tree-node", modelId: string, nodeId: string): void;
  (
    event: "tree-selection-change",
    payload: {
      activeNodeId: string | null;
      highlightedNodeIds: string[];
      selectionAnchorNodeId: string | null;
    },
  ): void;
  (event: "focus-tree-node", nodeId: string): void;
  (event: "delete-model", modelId: string): void;
}>();

const fileInputElement = ref<HTMLInputElement | null>(null);
const searchTerm = ref("");
const treeContextMenu = ref<{
  x: number;
  y: number;
  nodeId: string;
  nodeLabel: string;
  localId: number | null;
  modelId: string;
} | null>(null);

const forceExpandAll = computed(() => Boolean(searchTerm.value.trim()));
const filteredModels = computed(() => filterModels(props.models, searchTerm.value));
const visibleNodeCount = computed(() =>
  filteredModels.value.reduce(
    (total, model) => total + countVisibleNodes(model.rootNodes, forceExpandAll.value),
    0
  )
);
const visibleTreeNodeIds = computed(() =>
  filteredModels.value.flatMap((model) =>
    forceExpandAll.value || model.isExpanded
      ? flattenVisibleNodeIds(model.rootNodes, forceExpandAll.value)
      : []
  )
);

watch(
  () => props.models,
  () => {
    const nextSelection = sanitizeSelectionPayload({
      activeNodeId: props.selectionState.activeTreeNodeId,
      highlightedNodeIds: props.selectionState.highlightedTreeNodeIds,
      selectionAnchorNodeId: props.selectionState.selectionAnchorTreeNodeId,
    });

    if (
      nextSelection.activeNodeId !== props.selectionState.activeTreeNodeId ||
      nextSelection.selectionAnchorNodeId !== props.selectionState.selectionAnchorTreeNodeId ||
      nextSelection.highlightedNodeIds.length !==
        props.selectionState.highlightedTreeNodeIds.length ||
      nextSelection.highlightedNodeIds.some(
        (nodeId, index) =>
          nodeId !== props.selectionState.highlightedTreeNodeIds[index],
      )
    ) {
      emit("tree-selection-change", nextSelection);
    }
  },
  { immediate: true }
);

onMounted(() => {
  window.addEventListener("click", onWindowClick);
});

onBeforeUnmount(() => {
  window.removeEventListener("click", onWindowClick);
});

const onUploadClick = () => {
  treeContextMenu.value = null;
  fileInputElement.value?.click();
};

const onFileInputChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = Array.from(target.files ?? []);
  if (files.length > 0) {
    emit("files-selected", files);
  }
  target.value = "";
};

const onToggleNode = (modelId: string, nodeId: string) => {
  treeContextMenu.value = null;
  emit("toggle-tree-node", modelId, nodeId);
};

const onSelectNode = (node: IfcTreeNode, mouseEvent: MouseEvent) => {
  const additive = Boolean(mouseEvent.ctrlKey || mouseEvent.metaKey);
  const rangeSelection = Boolean(mouseEvent.shiftKey);
  const sanitizedSelection = sanitizeNodeIds(props.selectionState.highlightedTreeNodeIds);
  const anchorId =
    props.selectionState.selectionAnchorTreeNodeId &&
    visibleTreeNodeIds.value.includes(props.selectionState.selectionAnchorTreeNodeId)
      ? props.selectionState.selectionAnchorTreeNodeId
      : props.selectionState.activeTreeNodeId &&
          visibleTreeNodeIds.value.includes(props.selectionState.activeTreeNodeId)
        ? props.selectionState.activeTreeNodeId
        : visibleTreeNodeIds.value.includes(node.id)
          ? node.id
          : null;

  treeContextMenu.value = null;

  if (rangeSelection && anchorId) {
    const rangeIds = collectRangeIds(visibleTreeNodeIds.value, anchorId, node.id);
    emitSelectionChange({
      activeNodeId: node.id,
      highlightedNodeIds: additive
        ? uniqueIds([...sanitizedSelection, ...rangeIds])
        : rangeIds,
      selectionAnchorNodeId: anchorId,
    });
    return;
  }

  if (additive) {
    if (sanitizedSelection.includes(node.id)) {
      const nextHighlightedIds = sanitizedSelection.filter((nodeId) => nodeId !== node.id);
      emitSelectionChange({
        activeNodeId:
          props.selectionState.activeTreeNodeId === node.id
          ? nextHighlightedIds.at(-1) ?? null
          : props.selectionState.activeTreeNodeId,
        highlightedNodeIds: nextHighlightedIds,
        selectionAnchorNodeId: node.id,
      });
      return;
    }

    emitSelectionChange({
      activeNodeId: node.id,
      highlightedNodeIds: uniqueIds([...sanitizedSelection, node.id]),
      selectionAnchorNodeId: node.id,
    });
    return;
  }

  emitSelectionChange({
    activeNodeId: node.id,
    highlightedNodeIds: [node.id],
    selectionAnchorNodeId: node.id,
  });
};

const onFocusNode = (node: IfcTreeNode) => {
  treeContextMenu.value = null;
  emit("focus-tree-node", node.id);
};

const onTreeNodeContextMenu = (node: IfcTreeNode, mouseEvent: MouseEvent) => {
  if (!props.selectionState.highlightedTreeNodeIds.includes(node.id)) {
    emitSelectionChange({
      activeNodeId: node.id,
      highlightedNodeIds: [node.id],
      selectionAnchorNodeId: node.id,
    });
  }

  treeContextMenu.value = {
    x: mouseEvent.clientX,
    y: mouseEvent.clientY,
    nodeId: node.id,
    nodeLabel: node.label,
    localId: node.localId,
    modelId: node.modelId,
  };
};

const onCopyTreeNodeId = async () => {
  if (!treeContextMenu.value) {
    return;
  }

  const copiedId =
    treeContextMenu.value.localId !== null
      ? `${treeContextMenu.value.modelId}:${treeContextMenu.value.localId}`
      : treeContextMenu.value.nodeId;

  await navigator.clipboard.writeText(copiedId);
  treeContextMenu.value = null;
};

const onCopyTreeNodeName = async () => {
  if (!treeContextMenu.value) {
    return;
  }

  await navigator.clipboard.writeText(treeContextMenu.value.nodeLabel);
  treeContextMenu.value = null;
};

function filterModels(models: IfcViewerModelTreeNode[], term: string) {
  const normalized = term.trim().toLowerCase();

  if (!normalized) {
    return models;
  }

  return models
    .map((model) => {
      const modelMatches = `${model.name} ${model.sourceFileName}`
        .toLowerCase()
        .includes(normalized);
      const filteredRoots = filterNodes(model.rootNodes, normalized);

      if (!modelMatches && !filteredRoots.length) {
        return null;
      }

      return {
        ...model,
        rootNodes: filteredRoots.length ? filteredRoots : model.rootNodes,
      };
    })
    .filter((model): model is IfcViewerModelTreeNode => Boolean(model));
}

function filterNodes(nodes: IfcTreeNode[], term: string): IfcTreeNode[] {
  return nodes
    .map((node) => {
      const haystack = `${node.label} ${node.ifcCategory ?? ""} ${node.localId ?? ""}`
        .toLowerCase();
      const filteredChildren = filterNodes(node.children, term);

      if (haystack.includes(term) || filteredChildren.length) {
        return {
          ...node,
          children: filteredChildren,
        };
      }

      return null;
    })
    .filter((node): node is IfcTreeNode => Boolean(node));
}

function countVisibleNodes(nodes: IfcTreeNode[], forceExpand: boolean): number {
  return nodes.reduce((total, node) => {
    if (!node.children.length) {
      return total + 1;
    }

    if (forceExpand || node.isExpanded) {
      return total + 1 + countVisibleNodes(node.children, forceExpand);
    }

    return total + 1;
  }, 0);
}

function flattenVisibleNodeIds(nodes: IfcTreeNode[], forceExpand: boolean): string[] {
  return nodes.flatMap((node) => {
    if (!node.children.length || !(forceExpand || node.isExpanded)) {
      return [node.id];
    }

    return [node.id, ...flattenVisibleNodeIds(node.children, forceExpand)];
  });
}

function emitSelectionChange(payload: {
  activeNodeId: string | null;
  highlightedNodeIds: string[];
  selectionAnchorNodeId: string | null;
}) {
  emit("tree-selection-change", sanitizeSelectionPayload(payload));
}

function sanitizeNodeIds(nodeIds: string[]): string[] {
  return nodeIds.filter((nodeId) => Boolean(findNodeById(props.models, nodeId)));
}

function sanitizeSelectionPayload(payload: {
  activeNodeId: string | null;
  highlightedNodeIds: string[];
  selectionAnchorNodeId: string | null;
}) {
  const highlightedNodeIds = uniqueIds(sanitizeNodeIds(payload.highlightedNodeIds));
  const activeNodeId =
    findNodeById(props.models, payload.activeNodeId)?.id ??
    highlightedNodeIds.at(-1) ??
    null;
  const selectionAnchorNodeId =
    findNodeById(props.models, payload.selectionAnchorNodeId)?.id ?? activeNodeId;

  return {
    activeNodeId,
    highlightedNodeIds: highlightedNodeIds.length
      ? highlightedNodeIds
      : activeNodeId
        ? [activeNodeId]
        : [],
    selectionAnchorNodeId,
  };
}

function findNodeById(
  models: IfcViewerModelTreeNode[],
  nodeId: string | null
): IfcTreeNode | null {
  if (!nodeId) {
    return null;
  }

  for (const model of models) {
    const match = findNodeInTree(model.rootNodes, nodeId);
    if (match) {
      return match;
    }
  }

  return null;
}

function findNodeInTree(nodes: IfcTreeNode[], nodeId: string): IfcTreeNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }

    const nestedMatch = findNodeInTree(node.children, nodeId);
    if (nestedMatch) {
      return nestedMatch;
    }
  }

  return null;
}

function collectRangeIds(
  visibleNodeIds: string[],
  anchorId: string,
  nodeId: string
): string[] {
  const anchorIndex = visibleNodeIds.indexOf(anchorId);
  const targetIndex = visibleNodeIds.indexOf(nodeId);

  if (anchorIndex === -1 || targetIndex === -1) {
    return [nodeId];
  }

  const [start, end] =
    anchorIndex <= targetIndex
      ? [anchorIndex, targetIndex]
      : [targetIndex, anchorIndex];

  return visibleNodeIds.slice(start, end + 1);
}

function uniqueIds(nodeIds: string[]): string[] {
  return [...new Set(nodeIds)];
}

function onWindowClick() {
  treeContextMenu.value = null;
}
</script>

<style module>
.sidebar {
  position: relative;
  height: 100%;
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
  color: var(--ds-color-text-primary);
}

.sidebarHeader {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
}

.sidebarTitle {
  font-size: 15px;
  font-weight: 700;
}

.sidebarSubtitle {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ds-color-text-secondary);
  word-break: break-word;
}

.sidebarHint {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: var(--ds-color-text-muted);
}

.countChip {
  flex: 0 0 auto;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(238, 243, 249, 0.9);
  color: var(--ds-color-text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.sidebarControls {
  display: grid;
  gap: 10px;
}

.searchField {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.66);
  border: 1px solid rgba(216, 224, 234, 0.88);
}

.searchIcon {
  color: var(--ds-color-text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.searchInput {
  width: 100%;
  min-width: 0;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--ds-color-text-primary);
  font: inherit;
  outline: none;
}

.uploadButton,
.emptyUploadButton,
.contextMenuButton,
.deleteButton {
  border: 0;
  cursor: pointer;
  font: inherit;
}

.uploadButton,
.emptyUploadButton {
  min-height: 42px;
  padding: 0 14px;
  border-radius: 14px;
  background: var(--ds-color-brand-500);
  color: var(--ds-color-text-on-brand);
  font-weight: 700;
}

.hiddenInput {
  display: none;
}

.sidebarBody {
  min-height: 0;
  overflow: auto;
  display: grid;
  gap: 12px;
  padding-right: 4px;
}

.modelCard {
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid rgba(216, 224, 234, 0.88);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.72),
    0 14px 30px rgba(9, 19, 37, 0.06);
}

.modelToolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: start;
  padding: 12px 12px 0;
}

.modelButton {
  width: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font: inherit;
}

.modelButtonMain {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.chevron {
  color: var(--ds-color-text-secondary);
  line-height: 1.4;
}

.modelName {
  display: block;
  color: var(--ds-color-text-primary);
  font-weight: 700;
  word-break: break-word;
}

.modelMeta {
  display: block;
  margin-top: 4px;
  color: var(--ds-color-text-secondary);
  font-size: 11px;
  word-break: break-word;
}

.modelStats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  color: var(--ds-color-text-muted);
  font-size: 11px;
  font-weight: 600;
}

.deleteButton {
  min-height: 34px;
  padding: 0 10px;
  border-radius: 10px;
  background: color-mix(in srgb, #b42318 10%, white);
  color: #b42318;
}

.modelChildren {
  display: grid;
  gap: 8px;
  padding: 10px 12px 12px;
}

.emptyState {
  margin: auto 0;
  padding: 24px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.66);
  border: 1px dashed var(--ds-color-border-strong);
}

.emptyBadge {
  display: inline-flex;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(238, 243, 249, 0.9);
  color: var(--ds-color-text-secondary);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.emptyTitle {
  margin-top: 14px;
  color: var(--ds-color-text-primary);
  font-weight: 700;
}

.emptyText {
  margin-top: 8px;
  color: var(--ds-color-text-secondary);
  line-height: 1.5;
}

.emptyUploadButton {
  margin-top: 16px;
}

.contextMenu {
  position: fixed;
  z-index: 20;
  min-width: 180px;
  padding: 8px;
  border-radius: 14px;
  border: 1px solid var(--ds-color-border-default);
  background: var(--ds-color-bg-surface);
  box-shadow: 0 20px 60px rgba(10, 18, 36, 0.18);
}

.contextMenuButton {
  width: 100%;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 10px;
  background: transparent;
  text-align: left;
  color: #b42318;
}

.contextMenuButton:hover {
  background: color-mix(in srgb, #b42318 10%, white);
}
</style>
