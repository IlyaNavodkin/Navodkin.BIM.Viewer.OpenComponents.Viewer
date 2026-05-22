<template>
  <div :class="$style.layout">
    <IfcViewerSidebar
      :project-name="projectName"
      :models="models"
      :selected-element-id="selectedElement?.elementId ?? null"
      :context-menu="contextMenu"
      @files-selected="emit('files-selected', $event)"
      @toggle-model="emit('toggle-model', $event)"
      @toggle-tree-node="(modelId, nodeId) => emit('toggle-tree-node', modelId, nodeId)"
      @select-element="(modelId, localId) => emit('select-element', modelId, localId)"
      @model-context-menu="emit('model-context-menu', $event)"
      @delete-model="emit('delete-model', $event)"
    />

    <IfcViewerViewport
      :has-models="models.length > 0"
      :is-loading="isLoading"
      :progress="progress"
      :status-text="statusText"
      :error-message="errorMessage"
      @viewport-mounted="emit('viewport-mounted', $event)"
      @viewport-unmounted="emit('viewport-unmounted')"
      @files-selected="emit('files-selected', $event)"
    />

    <IfcViewerPropertiesSidebar :selected-element="selectedElement" />
  </div>
</template>

<script setup lang="ts">
import IfcViewerPropertiesSidebar from "./IfcViewerPropertiesSidebar.vue";
import IfcViewerSidebar from "./IfcViewerSidebar.vue";
import IfcViewerViewport from "./IfcViewerViewport.vue";
import type {
  IfcViewerContextMenuState,
  IfcViewerModelTreeNode,
  IfcViewerSelectedElement,
} from "../../types/ifcViewer";

defineProps<{
  projectName: string;
  models: IfcViewerModelTreeNode[];
  selectedElement: IfcViewerSelectedElement | null;
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
  (event: "select-element", modelId: string, localId: number): void;
  (event: "model-context-menu", payload: {
    x: number;
    y: number;
    modelId: string;
  }): void;
  (event: "delete-model", modelId: string): void;
}>();
</script>

<style module>
.layout {
  display: grid;
  grid-template-columns: minmax(280px, 360px) minmax(0, 1fr) minmax(280px, 360px);
  grid-template-rows: minmax(0, 1fr);
  width: 100%;
  height: 100vh;
  min-height: 100vh;
  overflow: hidden;
  background: var(--ds-color-bg-surface-muted);
}

.layout > * {
  min-width: 0;
  min-height: 0;
}

@media (max-width: 1280px) {
  .layout {
    grid-template-columns: minmax(280px, 320px) minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  }
}

@media (max-width: 1024px) {
  .layout {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(240px, 0.9fr) minmax(300px, 1.2fr) minmax(220px, 0.9fr);
  }
}
</style>
