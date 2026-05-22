<template>
  <section :class="$style.viewportShell">
    <div :class="$style.viewport" ref="viewportElement" />

    <div :class="$style.overlay" v-if="isLoading || !hasModels || errorMessage">
      <div :class="$style.overlayCard">
        <div :class="$style.overlayTitle">
          {{ errorMessage ? "Viewer Error" : hasModels ? "Loading models" : "Empty project" }}
        </div>
        <div :class="$style.overlayText">
          {{
            errorMessage
              ? errorMessage
              : hasModels
                ? statusText
                : "Upload IFC files to start a new project."
          }}
        </div>
        <div :class="$style.progressText" v-if="isLoading && progress !== null">
          {{ progress }}%
        </div>
        <button
          v-if="!hasModels"
          :class="$style.overlayButton"
          type="button"
          @click="onUploadClick"
        >
          Select IFC Files
        </button>
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
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

export interface IIfcViewerViewportProps {
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
  (event: "files-selected", files: File[]): void;
}>();

const viewportElement = ref<HTMLDivElement | null>(null);
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
.viewportShell {
  position: relative;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.viewport {
  width: 100%;
  height: 100%;
  min-height: 0;
  background:
    radial-gradient(circle at top, rgba(56, 189, 248, 0.12), transparent 34%),
    linear-gradient(
      180deg,
      var(--ds-color-bg-page) 0%,
      var(--ds-color-bg-canvas) 100%
    );
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  pointer-events: none;
}

.overlayCard {
  width: min(100%, 360px);
  padding: 24px;
  border-radius: 22px;
  border: 1px solid color-mix(in srgb, var(--ds-color-border-default) 72%, transparent);
  background: color-mix(in srgb, var(--ds-color-bg-surface) 88%, transparent);
  box-shadow: 0 22px 80px rgba(10, 18, 36, 0.22);
  backdrop-filter: blur(18px);
  pointer-events: auto;
}

.overlayTitle {
  color: var(--ds-color-text-primary);
  font-size: 20px;
  font-weight: 700;
}

.overlayText {
  margin-top: 10px;
  color: var(--ds-color-text-secondary);
  line-height: 1.5;
}

.progressText {
  margin-top: 14px;
  color: var(--ds-color-text-primary);
  font-weight: 700;
}

.overlayButton {
  margin-top: 18px;
  min-height: 42px;
  padding: 0 16px;
  border: 0;
  border-radius: 12px;
  background: var(--ds-color-brand-500);
  color: var(--ds-color-text-on-brand);
  cursor: pointer;
  font: inherit;
  font-weight: 600;
}

.hiddenInput {
  display: none;
}
</style>
