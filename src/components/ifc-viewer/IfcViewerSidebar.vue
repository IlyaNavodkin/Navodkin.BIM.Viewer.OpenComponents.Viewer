<template>
  <aside :class="$style.sidebar">
    <div :class="$style.sidebarHeader">
      <div>
        <div :class="$style.sidebarEyebrow">Project</div>
        <h2 :class="$style.sidebarTitle">{{ projectName }}</h2>
      </div>
      <div :class="$style.sidebarHeaderActions">
        <button :class="$style.uploadButton" type="button" @click="onUploadClick">
          Upload IFC
        </button>
        <div :class="$style.sidebarMeta">
          {{ models.length }} model{{ models.length === 1 ? "" : "s" }}
        </div>
      </div>
    </div>

    <input
      ref="fileInputElement"
      :class="$style.hiddenInput"
      accept=".ifc"
      multiple
      type="file"
      @change="onFileInputChange"
    />

    <div :class="$style.sidebarBody" v-if="models.length > 0">
      <section
        v-for="model in models"
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
                {{ model.isExpanded ? "v" : ">" }}
              </span>
              <span :class="$style.modelName">{{ model.name }}</span>
            </span>
            <span :class="$style.modelCount">{{ model.elementCount }}</span>
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

        <div :class="$style.modelChildren" v-if="model.isExpanded">
          <IfcViewerTreeNode
            v-for="rootNode in model.rootNodes"
            :key="rootNode.id"
            :node="rootNode"
            :selected-element-id="selectedElementId"
            @toggle-node="onToggleNode"
            @select-element="onSelectElement"
          />
        </div>
      </section>
    </div>

    <div :class="$style.emptyState" v-else>
      <div :class="$style.emptyTitle">Empty project</div>
      <div :class="$style.emptyText">
        Upload one or more IFC models to populate the project tree.
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
  </aside>
</template>

<script setup lang="ts">
import { ref } from "vue";
import IfcViewerTreeNode from "./IfcViewerTreeNode.vue";
import type {
  IfcViewerContextMenuState,
  IfcViewerModelTreeNode,
} from "../../types/ifcViewer";

export interface IIfcViewerSidebarProps {
  projectName: string;
  models: IfcViewerModelTreeNode[];
  selectedElementId: string | null;
  contextMenu: IfcViewerContextMenuState;
}

defineProps<IIfcViewerSidebarProps>();

const emit = defineEmits<{
  (event: "files-selected", files: File[]): void;
  (
    event: "model-context-menu",
    payload: { x: number; y: number; modelId: string },
  ): void;
  (event: "toggle-model", modelId: string): void;
  (event: "toggle-tree-node", modelId: string, nodeId: string): void;
  (event: "select-element", modelId: string, localId: number): void;
  (event: "delete-model", modelId: string): void;
}>();

const fileInputElement = ref<HTMLInputElement | null>(null);

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

const onToggleNode = (modelId: string, nodeId: string) => {
  emit("toggle-tree-node", modelId, nodeId);
};

const onSelectElement = (modelId: string, localId: number) => {
  emit("select-element", modelId, localId);
};
</script>

<style module>
.sidebar {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  border-right: 1px solid var(--ds-color-border-default);
  background: color-mix(in srgb, var(--ds-color-bg-surface) 92%, transparent);
}

.sidebarHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px;
  border-bottom: 1px solid var(--ds-color-border-default);
}

.sidebarHeaderActions {
  display: grid;
  gap: 10px;
  justify-items: end;
}

.sidebarEyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ds-color-text-muted);
}

.sidebarTitle {
  margin: 6px 0 0;
  font-size: 20px;
  line-height: 1.2;
  color: var(--ds-color-text-primary);
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
  min-height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  background: var(--ds-color-brand-500);
  color: var(--ds-color-text-on-brand);
  font-weight: 600;
}

.sidebarMeta {
  padding: 8px 10px;
  border-radius: 999px;
  background: var(--ds-color-bg-surface-muted);
  color: var(--ds-color-text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.hiddenInput {
  display: none;
}

.sidebarBody {
  flex: 1;
  overflow: auto;
  padding: 16px;
  display: grid;
  gap: 12px;
}

.modelCard {
  border: 1px solid var(--ds-color-border-default);
  border-radius: 16px;
  background: var(--ds-color-bg-surface);
}

.modelToolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 12px 12px 0;
}

.modelButton {
  width: 100%;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font: inherit;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 40px;
  padding: 0 4px;
}

.modelButtonMain {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.chevron {
  width: 14px;
  color: var(--ds-color-text-secondary);
}

.modelName {
  color: var(--ds-color-text-primary);
  font-weight: 600;
  word-break: break-word;
}

.modelCount {
  color: var(--ds-color-text-muted);
  font-size: 12px;
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
  padding: 8px 12px 12px;
  display: grid;
  gap: 8px;
}

.emptyState {
  margin: auto 20px;
  padding: 24px;
  border-radius: 20px;
  background: var(--ds-color-bg-surface);
  border: 1px dashed var(--ds-color-border-strong);
}

.emptyTitle {
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
