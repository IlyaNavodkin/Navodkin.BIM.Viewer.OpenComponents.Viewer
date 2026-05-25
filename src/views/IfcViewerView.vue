<template>
  <IfcViewerWorkspace
    :project-name="state.projectName"
    :current-model="state.currentModel"
    :can-download-frag="canDownloadFrag"
    :is-loading="state.isLoading"
    :progress="state.progress"
    :status-text="state.statusText"
    :error-message="state.errorMessage"
    @viewport-mounted="page.onViewportMounted"
    @viewport-unmounted="page.onViewportUnmounted"
    @ifc-file-selected="page.onIfcFileSelected"
    @frag-file-selected="page.onFragFileSelected"
    @download-frag="page.onFragDownload"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { v4 as uuidv4 } from "uuid";
import IfcViewerWorkspace from "../components/ifc-viewer/IfcViewerWorkspace.vue";
import { useIfcViewerPage } from "../composables/useIfcViewerPage";

const page = useIfcViewerPage({
  viewerId: `ifc-viewer:${uuidv4()}`,
});

const state = computed(() => page.state.value);
const canDownloadFrag = computed(() => page.canDownloadFrag.value);
</script>
