<template>
  <IfcViewerLayout
    :project-name="state.projectName"
    :models="state.models"
    :selected-element="state.selectedElement"
    :selection="state.selection"
    :context-menu="state.contextMenu"
    :is-loading="state.isLoading"
    :progress="state.progress"
    :status-text="state.statusText"
    :error-message="state.errorMessage"
    @viewport-mounted="page.onViewportMounted"
    @viewport-unmounted="page.onViewportUnmounted"
    @files-selected="page.onFilesSelected"
    @toggle-model="page.onModelToggle"
    @toggle-tree-node="page.onTreeNodeToggle"
    @tree-selection-change="page.onTreeSelectionChange"
    @focus-tree-node="page.onTreeNodeFocus"
    @select-element="page.onElementSelect"
    @model-context-menu="page.onModelContextMenu"
    @delete-model="page.onContextMenuDelete"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { v4 as uuidv4 } from "uuid";
import IfcViewerLayout from "../components/ifc-viewer/IfcViewerLayout.vue";
import { useIfcViewerPage } from "../composables/useIfcViewerPage";

const page = useIfcViewerPage({
  viewerId: `ifc-viewer:${uuidv4()}`,
});

const state = computed(() => page.state.value);
</script>
