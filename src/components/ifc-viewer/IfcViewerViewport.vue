<template>
  <section :class="$style.viewportCard" class="viewport-card">
    <div :class="$style.viewport" ref="viewportElement" />
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

export interface IIfcViewerViewportProps {
  projectName: string;
  modelCount: number;
  selectedElementName: string | null;
  selectedNodeLabel: string | null;
  selectedNodeCount: number;
  hasModels: boolean;
  isLoading: boolean;
  progress: number | null;
  statusText: string;
  errorMessage: string | null;
}

defineProps<IIfcViewerViewportProps>();

const emit = defineEmits<{
  (event: "viewport-mounted", element: HTMLDivElement): void;
  (event: "viewport-unmounted"): void;
}>();

const viewportElement = ref<HTMLDivElement | null>(null);

onMounted(() => {
  if (viewportElement.value) {
    emit("viewport-mounted", viewportElement.value);
  }
});

onBeforeUnmount(() => {
  emit("viewport-unmounted");
});
</script>

<style module>
.viewportCard {
  height: 100%;
  min-height: 560px;
  border-radius: 28px;
  overflow: hidden;
  background: linear-gradient(135deg, #091325 0%, #12213d 45%, #172e59 100%);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.viewport {
  position: absolute;
  inset: 0;
  z-index: 1;
}

@media (max-width: 900px) {
  .viewportCard {
    min-height: 460px;
  }
}
</style>
