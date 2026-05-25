<template>
  <section :class="$style.page">
    <header :class="$style.header">
      <div :class="$style.headerCopy">
        <p :class="$style.eyebrow">Minimal viewer</p>
        <h1 :class="$style.title">{{ projectName }}</h1>
        <p :class="$style.subtitle">
          Load one IFC or FRAG model at a time, view it in the canvas, and export
          `.frag` only for IFC-derived models.
        </p>
      </div>

      <div :class="$style.controls">
        <button
          :class="[$style.button, $style.primaryButton]"
          type="button"
          @click="onIfcUploadClick"
        >
          Upload IFC
        </button>
        <button
          :class="[$style.button, $style.secondaryButton]"
          type="button"
          @click="onFragUploadClick"
        >
          Upload FRAG
        </button>
        <button
          :class="[$style.button, $style.ghostButton]"
          :disabled="!canDownloadFrag || isLoading"
          type="button"
          @click="emit('download-frag')"
        >
          Download FRAG
        </button>
      </div>
    </header>

    <div :class="$style.statusRow" aria-live="polite">
      <div :class="$style.statusBlock">
        <span :class="$style.statusLabel">Status</span>
        <span :class="$style.statusValue">
          {{ errorMessage ?? statusText }}
          <template v-if="isLoading && progress !== null"> ({{ progress }}%)</template>
        </span>
      </div>

      <div :class="$style.statusBlock">
        <span :class="$style.statusLabel">Current model</span>
        <span :class="$style.statusValue">
          {{ currentModel ? currentModel.name : "None" }}
        </span>
      </div>

      <div :class="$style.statusBlock">
        <span :class="$style.statusLabel">Source</span>
        <span :class="$style.statusValue">
          {{ currentModel ? currentModel.sourceType.toUpperCase() : "-" }}
        </span>
      </div>
    </div>

    <section :class="$style.viewerShell">
      <IfcViewerViewport
        :project-name="projectName"
        :model-count="currentModel ? 1 : 0"
        :selected-element-name="null"
        :selected-node-label="null"
        :selected-node-count="0"
        :has-models="Boolean(currentModel)"
        :is-loading="isLoading"
        :progress="progress"
        :status-text="statusText"
        :error-message="errorMessage"
        @viewport-mounted="emit('viewport-mounted', $event)"
        @viewport-unmounted="emit('viewport-unmounted')"
      />

      <div v-if="showOverlay" :class="$style.overlay">
        <div :class="$style.overlayCard">
          <p :class="$style.overlayTitle">{{ overlayTitle }}</p>
          <p :class="$style.overlayText">{{ overlayText }}</p>
        </div>
      </div>
    </section>

    <input
      ref="ifcInputElement"
      :class="$style.hiddenInput"
      accept=".ifc,.IFC"
      type="file"
      @change="onIfcInputChange"
    />
    <input
      ref="fragInputElement"
      :class="$style.hiddenInput"
      accept=".frag,.FRAG"
      type="file"
      @change="onFragInputChange"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { IfcViewerCurrentModel } from "../../types/ifcViewer";
import IfcViewerViewport from "./IfcViewerViewport.vue";

const props = defineProps<{
  projectName: string;
  currentModel: IfcViewerCurrentModel | null;
  canDownloadFrag: boolean;
  isLoading: boolean;
  progress: number | null;
  statusText: string;
  errorMessage: string | null;
}>();

const emit = defineEmits<{
  (event: "viewport-mounted", container: HTMLDivElement): void;
  (event: "viewport-unmounted"): void;
  (event: "ifc-file-selected", file: File | null): void;
  (event: "frag-file-selected", file: File | null): void;
  (event: "download-frag"): void;
}>();

const ifcInputElement = ref<HTMLInputElement | null>(null);
const fragInputElement = ref<HTMLInputElement | null>(null);

const showOverlay = computed(
  () => props.isLoading || Boolean(props.errorMessage) || !props.currentModel,
);
const overlayTitle = computed(() => {
  if (props.errorMessage) {
    return "Load failed";
  }

  if (props.isLoading) {
    return "Loading model";
  }

  return "No model loaded";
});
const overlayText = computed(() => {
  if (props.errorMessage) {
    return props.errorMessage;
  }

  if (props.isLoading) {
    return props.progress !== null
      ? `${props.statusText} ${props.progress}%`
      : props.statusText;
  }

  return "Use Upload IFC to convert and preview a model, or Upload FRAG to open an existing fragments file.";
});

const emitSelectedFile = (
  event: Event,
  type: "ifc-file-selected" | "frag-file-selected",
) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0] ?? null;
  emit(type, file);
  target.value = "";
};

const onIfcUploadClick = () => {
  ifcInputElement.value?.click();
};

const onFragUploadClick = () => {
  fragInputElement.value?.click();
};

const onIfcInputChange = (event: Event) => {
  emitSelectedFile(event, "ifc-file-selected");
};

const onFragInputChange = (event: Event) => {
  emitSelectedFile(event, "frag-file-selected");
};
</script>

<style module>
.page {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 16px;
  min-height: 100vh;
  padding: 20px;
  background:
    radial-gradient(circle at top left, rgba(38, 166, 154, 0.16), transparent 28%),
    linear-gradient(180deg, var(--ds-color-bg-page) 0%, var(--ds-color-bg-canvas) 100%);
  color: var(--ds-color-text-on-dark);
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  background: rgba(12, 20, 36, 0.72);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.18);
}

.headerCopy {
  max-width: 700px;
}

.eyebrow {
  margin: 0 0 8px;
  color: rgba(247, 247, 242, 0.68);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.title {
  margin: 0;
  font-size: clamp(28px, 4vw, 40px);
  line-height: 1.05;
}

.subtitle {
  margin: 12px 0 0;
  max-width: 620px;
  color: rgba(247, 247, 242, 0.78);
  font-size: 14px;
  line-height: 1.6;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
}

.button {
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid transparent;
  border-radius: 14px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease;
}

.button:hover:enabled {
  transform: translateY(-1px);
}

.button:disabled {
  cursor: not-allowed;
  opacity: 0.56;
}

.primaryButton {
  background: var(--ds-color-accent-500);
  color: var(--ds-color-text-on-brand);
}

.secondaryButton {
  background: rgba(248, 251, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.12);
  color: var(--ds-color-text-on-dark);
}

.ghostButton {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.16);
  color: var(--ds-color-text-on-dark);
}

.statusRow {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.statusBlock {
  display: grid;
  gap: 6px;
  padding: 16px 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  background: rgba(248, 251, 255, 0.08);
}

.statusLabel {
  color: rgba(247, 247, 242, 0.58);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.statusValue {
  color: var(--ds-color-text-on-dark);
  font-size: 14px;
  line-height: 1.45;
  word-break: break-word;
}

.viewerShell {
  position: relative;
  min-height: 0;
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
  width: min(100%, 420px);
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  background: rgba(12, 20, 36, 0.8);
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.24);
}

.overlayTitle {
  margin: 0;
  color: var(--ds-color-text-on-dark);
  font-size: 22px;
  font-weight: 700;
}

.overlayText {
  margin: 12px 0 0;
  color: rgba(247, 247, 242, 0.82);
  font-size: 14px;
  line-height: 1.6;
}

.hiddenInput {
  display: none;
}

@media (max-width: 900px) {
  .page {
    padding: 16px;
  }

  .header {
    flex-direction: column;
  }

  .controls {
    justify-content: flex-start;
  }

  .statusRow {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .page {
    padding: 12px;
  }

  .header {
    padding: 20px;
  }

  .controls {
    display: grid;
    grid-template-columns: 1fr;
  }

  .button {
    width: 100%;
  }
}
</style>
