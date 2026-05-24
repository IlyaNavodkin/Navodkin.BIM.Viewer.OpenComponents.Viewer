<template>
  <q-layout view="hHh lpr lFf" class="workspace-layout">
    <q-header class="workspace-header" bordered>
      <q-toolbar class="toolbar-shell">
        <q-btn
          flat
          round
          dense
          icon="menu"
          class="mobile-toggle lt-md"
          @click="leftDrawerOpen = !leftDrawerOpen"
        />

        <div class="header-copy">
          <div class="header-title">{{ projectName }}</div>
          <div class="header-subtitle">
            {{ headerSubtitle }}
          </div>
        </div>

        <q-space />

        <div class="header-metrics gt-sm">
          <div class="header-pill">
            <span class="header-pill-label">Models</span>
            <span class="header-pill-value">{{ models.length }}</span>
          </div>
          <div class="header-pill">
            <span class="header-pill-label">Elements</span>
            <span class="header-pill-value">{{ totalElements }}</span>
          </div>
          <div class="header-pill header-pill-selection">
            <span class="header-pill-label">Selection</span>
            <span class="header-pill-value header-pill-value-truncate">
              {{ selectionSummary }}
            </span>
          </div>
        </div>

        <q-btn
          flat
          round
          dense
          icon="tune"
          class="mobile-toggle lt-md"
          @click="rightDrawerOpen = !rightDrawerOpen"
        />

        <q-btn
          icon="upload_file"
          label="Upload IFC"
          no-caps
          unelevated
          class="manager-button"
          @click="onUploadClick"
        />
      </q-toolbar>
    </q-header>

    <q-drawer
      v-if="!isDesktop"
      v-model="leftDrawerOpen"
      :width="leftSidebarWidth"
      overlay
      behavior="mobile"
      class="workspace-drawer"
    >
      <aside class="drawer-shell drawer-shell-left" :style="getSidebarStyle(leftSidebarWidth)">
        <div class="drawer-shell-content">
          <IfcViewerSidebar
            :project-name="projectName"
            :models="models"
            :selection-state="selection"
            :context-menu="contextMenu"
            @files-selected="emit('files-selected', $event)"
            @toggle-model="emit('toggle-model', $event)"
            @toggle-tree-node="
              (modelId, nodeId) => emit('toggle-tree-node', modelId, nodeId)
            "
            @tree-selection-change="emit('tree-selection-change', $event)"
            @focus-tree-node="emit('focus-tree-node', $event)"
            @model-context-menu="emit('model-context-menu', $event)"
            @delete-model="emit('delete-model', $event)"
          />
        </div>
      </aside>
    </q-drawer>

    <q-drawer
      v-if="!isDesktop"
      v-model="rightDrawerOpen"
      side="right"
      :width="rightSidebarWidth"
      overlay
      behavior="mobile"
      class="workspace-drawer"
    >
      <aside class="drawer-shell drawer-shell-right" :style="getSidebarStyle(rightSidebarWidth)">
        <div class="drawer-shell-content">
          <IfcViewerPropertiesSidebar
            :selected-element="selectedElement"
            :highlighted-node-count="selection.highlightedTreeNodeIds.length"
          />
        </div>
      </aside>
    </q-drawer>

    <q-page-container>
      <q-page class="workspace-page">
        <div class="workspace-stage">
          <div class="viewport-layer">
            <IfcViewerViewport
              :project-name="projectName"
              :model-count="models.length"
              :selected-element-name="selectedElement?.displayName ?? null"
              :selected-node-label="activeTreeNodeLabel"
              :selected-node-count="selection.highlightedTreeNodeIds.length"
              :has-models="models.length > 0"
              :is-loading="isLoading"
              :progress="progress"
              :status-text="statusText"
              :error-message="errorMessage"
              @viewport-mounted="emit('viewport-mounted', $event)"
              @viewport-unmounted="emit('viewport-unmounted')"
              @files-selected="emit('files-selected', $event)"
            />
          </div>

          <div v-if="isDesktop" class="dock-panel dock-panel-left">
            <aside
              class="dock-shell dock-shell-left"
              :class="{ 'dock-shell-resizing': resizeState?.side === 'left' }"
              :style="getSidebarStyle(leftSidebarWidth)"
            >
              <div class="dock-shell-content">
                <IfcViewerSidebar
                  :project-name="projectName"
                  :models="models"
                  :selection-state="selection"
                  :context-menu="contextMenu"
                  @files-selected="emit('files-selected', $event)"
                  @toggle-model="emit('toggle-model', $event)"
                  @toggle-tree-node="
                    (modelId, nodeId) => emit('toggle-tree-node', modelId, nodeId)
                  "
                  @tree-selection-change="emit('tree-selection-change', $event)"
                  @focus-tree-node="emit('focus-tree-node', $event)"
                  @model-context-menu="emit('model-context-menu', $event)"
                  @delete-model="emit('delete-model', $event)"
                />
              </div>

              <button
                type="button"
                class="resize-handle resize-handle-left"
                aria-label="Resize left sidebar"
                @pointerdown="startResize('left', $event)"
              >
                <span class="resize-grip" />
              </button>
            </aside>
          </div>

          <div v-if="isDesktop" class="dock-panel dock-panel-right">
            <aside
              class="dock-shell dock-shell-right"
              :class="{ 'dock-shell-resizing': resizeState?.side === 'right' }"
              :style="getSidebarStyle(rightSidebarWidth)"
            >
              <div class="dock-shell-content">
                <IfcViewerPropertiesSidebar
                  :selected-element="selectedElement"
                  :highlighted-node-count="selection.highlightedTreeNodeIds.length"
                />
              </div>

              <button
                type="button"
                class="resize-handle resize-handle-right"
                aria-label="Resize right sidebar"
                @pointerdown="startResize('right', $event)"
              >
                <span class="resize-grip" />
              </button>
            </aside>
          </div>
        </div>
      </q-page>
    </q-page-container>

    <input
      ref="fileInputElement"
      class="hidden-input"
      accept=".ifc"
      multiple
      type="file"
      @change="onFileInputChange"
    />
  </q-layout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useQuasar } from "quasar";
import type {
  IfcViewerContextMenuState,
  IfcViewerModelTreeNode,
  IfcViewerSelectionState,
  IfcViewerSelectedElement,
  IfcViewerTreeNode,
} from "../../types/ifcViewer";
import IfcViewerPropertiesSidebar from "./IfcViewerPropertiesSidebar.vue";
import IfcViewerSidebar from "./IfcViewerSidebar.vue";
import IfcViewerViewport from "./IfcViewerViewport.vue";

const MIN_SIDEBAR_WIDTH = 260;
const MAX_SIDEBAR_WIDTH = 440;

const props = defineProps<{
  projectName: string;
  models: IfcViewerModelTreeNode[];
  selectedElement: IfcViewerSelectedElement | null;
  selection: IfcViewerSelectionState;
  contextMenu: IfcViewerContextMenuState;
  isLoading: boolean;
  progress: number | null;
  statusText: string;
  errorMessage: string | null;
}>();

const emit = defineEmits<{
  (event: "viewport-mounted", container: HTMLDivElement): void;
  (event: "viewport-unmounted"): void;
  (event: "files-selected", files: File[]): void;
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
  (event: "select-element", modelId: string, localId: number): void;
  (event: "model-context-menu", payload: {
    x: number;
    y: number;
    modelId: string;
  }): void;
  (event: "delete-model", modelId: string): void;
}>();

const $q = useQuasar();

const fileInputElement = ref<HTMLInputElement | null>(null);
const leftDrawerOpen = ref(false);
const leftSidebarWidth = ref(318);
const rightDrawerOpen = ref(false);
const rightSidebarWidth = ref(348);
const resizeState = ref<{
  side: "left" | "right";
  startX: number;
  startWidth: number;
} | null>(null);

const isDesktop = computed(() => $q.screen.gt.sm);
const totalElements = computed(() =>
  props.models.reduce((total, model) => total + model.elementCount, 0)
);
const activeTreeNodeLabel = computed(() =>
  findNodeById(props.models, props.selection.activeTreeNodeId)?.label ?? null
);
const selectionSummary = computed(() => {
  if (props.selection.highlightedTreeNodeIds.length > 1) {
    return `${props.selection.highlightedTreeNodeIds.length} selected`;
  }

  return props.selectedElement?.displayName ?? activeTreeNodeLabel.value ?? "None";
});
const headerSubtitle = computed(() => {
  if (props.errorMessage) {
    return props.errorMessage;
  }

  if (props.isLoading) {
    return props.statusText;
  }

  if (!props.models.length) {
    return "Upload IFC files to initialize the workspace shell.";
  }

  if (props.selection.highlightedTreeNodeIds.length > 1) {
    return `${props.selection.highlightedTreeNodeIds.length} tree items are selected. Keep one active item to inspect a single property set.`;
  }

  if (props.selectedElement) {
    return `Focused on ${props.selectedElement.displayName}`;
  }

  if (activeTreeNodeLabel.value) {
    return `Active tree item: ${activeTreeNodeLabel.value}`;
  }

  return "Navigate the model tree, inspect element properties, and manage loaded IFC files.";
});

const getSidebarStyle = (width: number) => ({
  width: `${clampWidth(width)}px`,
  minWidth: `${MIN_SIDEBAR_WIDTH}px`,
  maxWidth: `${MAX_SIDEBAR_WIDTH}px`,
});

const onUploadClick = () => {
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

const startResize = (side: "left" | "right", event: PointerEvent) => {
  if (!isDesktop.value) {
    return;
  }

  resizeState.value = {
    side,
    startX: event.clientX,
    startWidth: side === "left" ? leftSidebarWidth.value : rightSidebarWidth.value,
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", stopResize);
  document.body.style.userSelect = "none";
  document.body.style.cursor = "col-resize";
};

function onPointerMove(event: PointerEvent) {
  if (!resizeState.value) {
    return;
  }

  const delta = event.clientX - resizeState.value.startX;
  const nextWidth =
    resizeState.value.side === "left"
      ? resizeState.value.startWidth + delta
      : resizeState.value.startWidth - delta;

  if (resizeState.value.side === "left") {
    leftSidebarWidth.value = clampWidth(nextWidth);
    return;
  }

  rightSidebarWidth.value = clampWidth(nextWidth);
}

function stopResize() {
  if (!resizeState.value) {
    return;
  }

  resizeState.value = null;
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", stopResize);
  document.body.style.userSelect = "";
  document.body.style.cursor = "";
}

function clampWidth(width: number) {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width));
}

function findTreeNodeById(
  nodes: IfcViewerTreeNode[],
  nodeId: string,
): IfcViewerTreeNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }

    const nestedMatch = findTreeNodeById(node.children, nodeId);
    if (nestedMatch) {
      return nestedMatch;
    }
  }

  return null;
}

function findNodeById(
  models: IfcViewerModelTreeNode[],
  nodeId: string | null,
): IfcViewerTreeNode | null {
  if (!nodeId) {
    return null;
  }

  for (const model of models) {
    const match = findTreeNodeById(model.rootNodes, nodeId);
    if (match) {
      return match;
    }
  }

  return null;
}

watch(isDesktop, (desktop) => {
  leftDrawerOpen.value = false;
  rightDrawerOpen.value = false;

  if (!desktop) {
    stopResize();
  }
});

onBeforeUnmount(() => {
  stopResize();
});
</script>

<style scoped>
.workspace-layout {
  background: linear-gradient(180deg, var(--ds-color-bg-page) 0%, var(--ds-color-bg-canvas) 100%);
}

.workspace-header {
  background: rgba(9, 19, 37, 0.72);
  color: var(--ds-color-text-on-dark);
  border-color: rgba(255, 255, 255, 0.08);
}

.toolbar-shell {
  min-height: 72px;
  gap: 12px;
  padding-inline: 12px;
}

.mobile-toggle {
  color: var(--ds-color-text-on-dark);
}

.header-copy {
  min-width: 0;
}

.header-title {
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(247, 247, 242, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-metrics {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.header-pill {
  display: grid;
  gap: 2px;
  min-width: 84px;
  padding: 8px 12px;
  border-radius: 14px;
  background: rgba(248, 251, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.header-pill-selection {
  min-width: 180px;
  max-width: 240px;
}

.header-pill-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(247, 247, 242, 0.58);
}

.header-pill-value {
  color: var(--ds-color-text-on-dark);
  font-size: 13px;
  font-weight: 700;
}

.header-pill-value-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.manager-button {
  border-radius: 14px;
  background: var(--ds-color-accent-500);
  color: var(--ds-color-text-on-brand);
}

.workspace-drawer {
  background: rgba(248, 251, 255, 0.94);
}

.workspace-page {
  min-height: calc(100vh - 72px);
  padding: 12px;
}

.workspace-stage {
  position: relative;
  min-height: calc(100vh - 96px);
  height: calc(100vh - 96px);
}

.viewport-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.dock-panel {
  position: absolute;
  top: 12px;
  bottom: 12px;
  z-index: 3;
  display: flex;
  min-height: 0;
}

.dock-panel-left {
  left: 12px;
}

.dock-panel-right {
  right: 12px;
}

.dock-shell,
.drawer-shell {
  position: relative;
  display: flex;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.dock-shell {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(248, 251, 255, 0.94);
  box-shadow:
    0 12px 28px rgba(9, 19, 37, 0.14),
    inset 0 0 0 1px rgba(255, 255, 255, 0.2);
}

.dock-shell-left {
  border-radius: 24px 18px 18px 24px;
}

.dock-shell-right {
  border-radius: 18px 24px 24px 18px;
}

.drawer-shell {
  border-radius: 0;
  background: rgba(248, 251, 255, 0.98);
}

.dock-shell-content,
.drawer-shell-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.dock-shell-resizing {
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--ds-color-brand-500) 30%, white),
    0 12px 28px rgba(9, 19, 37, 0.14);
}

.resize-handle {
  position: absolute;
  top: 12px;
  bottom: 12px;
  width: 12px;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: col-resize;
  z-index: 3;
}

.resize-handle-left {
  right: 0;
  transform: translateX(50%);
}

.resize-handle-right {
  left: 0;
  transform: translateX(-50%);
}

.resize-grip {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 56px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ds-color-brand-500) 22%, white);
  transform: translate(-50%, -50%);
  transition:
    height 0.18s ease,
    background-color 0.18s ease;
}

.resize-handle:hover .resize-grip,
.dock-shell-resizing .resize-grip {
  height: 88px;
  background: color-mix(in srgb, var(--ds-color-accent-500) 42%, white);
}

.hidden-input {
  display: none;
}

@media (max-width: 1023px) {
  .workspace-page {
    padding: 10px;
  }

  .workspace-stage {
    min-height: calc(100vh - 92px);
    height: auto;
  }
}

@media (max-width: 720px) {
  .toolbar-shell {
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .header-copy {
    order: 1;
    width: 100%;
  }

  .workspace-page {
    padding: 8px;
  }

  .workspace-stage {
    min-height: calc(100vh - 112px);
  }
}
</style>
