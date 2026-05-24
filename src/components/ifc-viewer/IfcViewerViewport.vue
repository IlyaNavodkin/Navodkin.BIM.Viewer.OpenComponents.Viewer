<template>
  <section :class="$style.viewportCard" class="viewport-card">
    <div :class="$style.viewportGrid">
      <div :class="[$style.viewportOverlay, $style.topLeft]">
        <div :class="$style.overlayBadge">IFC Workspace</div>
        <div :class="$style.overlayTitle">
          {{ projectName }}
        </div>
        <div :class="$style.overlaySubtitle">
          {{ overlaySubtitle }}
        </div>
      </div>

      <div :class="[$style.viewportOverlay, $style.topRight]">
        <div :class="$style.statsCard">
          <div :class="$style.statsGrid">
            <div>
              <div :class="$style.statsLabel">Models</div>
              <div :class="$style.statsValue">{{ modelCount }}</div>
            </div>
            <div>
              <div :class="$style.statsLabel">Status</div>
              <div :class="$style.statsValueSmall">{{ statusTone }}</div>
            </div>
            <div>
              <div :class="$style.statsLabel">Selection</div>
              <div :class="$style.statsValueSmall">
                {{ selectionSummary }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div :class="$style.viewportCenter">
        <div :class="$style.viewport" ref="viewportElement" />
      </div>

      <div :class="[$style.viewportOverlay, $style.bottomLeft]">
        <div :class="$style.focusCard">
          <div :class="$style.statsLabel">Active focus</div>
          <div :class="$style.focusTitle">
            {{ focusTitle }}
          </div>
          <div :class="$style.focusMeta">
            {{ focusCopy }}
          </div>
        </div>
      </div>

      <div :class="[$style.viewportOverlay, $style.bottomRight]">
        <div :class="$style.activityCard">
          <div :class="$style.statsLabel">Workspace activity</div>
          <div :class="$style.activityCopy">{{ activityCopy }}</div>
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

      <div v-if="isLoading || errorMessage" :class="$style.centerOverlay">
        <div :class="$style.centerOverlayCard">
          <div :class="$style.centerOverlayTitle">
            {{ errorMessage ? "Viewer error" : "Loading models" }}
          </div>
          <div :class="$style.centerOverlayText">
            {{ errorMessage ?? statusText }}
          </div>
          <div v-if="isLoading && progress !== null" :class="$style.progressText">
            {{ progress }}%
          </div>
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
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

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

const props = defineProps<IIfcViewerViewportProps>();

const emit = defineEmits<{
  (event: "viewport-mounted", element: HTMLDivElement): void;
  (event: "viewport-unmounted"): void;
  (event: "files-selected", files: File[]): void;
}>();

const viewportElement = ref<HTMLDivElement | null>(null);
const fileInputElement = ref<HTMLInputElement | null>(null);
const selectionSummary = computed(() => {
  if (props.selectedNodeCount > 1) {
    return `${props.selectedNodeCount} selected`;
  }

  return props.selectedElementName ?? props.selectedNodeLabel ?? "None";
});
const focusTitle = computed(() => {
  if (props.selectedNodeCount > 1) {
    return `${props.selectedNodeCount} tree items selected`;
  }

  return props.selectedElementName ?? props.selectedNodeLabel ?? "No element selected";
});

const statusTone = computed(() => {
  if (props.errorMessage) {
    return "Error";
  }

  if (props.isLoading) {
    return props.progress !== null ? `${props.progress}%` : "Loading";
  }

  return props.hasModels ? "Ready" : "Idle";
});

const overlaySubtitle = computed(() => {
  if (props.errorMessage) {
    return props.errorMessage;
  }

  if (props.isLoading) {
    return props.statusText;
  }

  if (!props.hasModels) {
    return "Upload IFC files to start a new project and activate the viewer canvas.";
  }

  return "Navigate the live scene, inspect properties, and keep the model tree in sync with selection.";
});

const focusCopy = computed(() => {
  if (props.selectedNodeCount > 1) {
    return "Tree and properties share the same selection state. The viewport highlights the selected IFC leaves.";
  }

  if (props.selectedElementName) {
    return "Properties and tree state are synchronized with the current element.";
  }

  if (props.selectedNodeLabel) {
    return "The active tree container is selected. Focus can still zoom to its descendant IFC elements.";
  }

  if (!props.hasModels) {
    return "Load at least one IFC file to enable scene navigation and element inspection.";
  }

  return "Select an IFC element in the tree or directly in the viewport.";
});

const activityCopy = computed(() => {
  if (props.errorMessage) {
    return "The viewer reported an error. Check the status message and try another file or reload flow.";
  }

  if (props.isLoading) {
    return props.statusText;
  }

  if (!props.hasModels) {
    return "The workspace is ready for uploads. Tree, viewport, and properties panel will populate automatically.";
  }

  return "Models are loaded. Use the explorer on the left and properties panel on the right for inspection workflows.";
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

.viewportGrid {
  position: relative;
  height: 100%;
  min-height: 560px;
  overflow: hidden;
}

.viewportOverlay {
  position: absolute;
  z-index: 2;
}

.topLeft {
  top: 18px;
  left: 18px;
  max-width: 440px;
}

.topRight {
  top: 18px;
  right: 18px;
}

.bottomLeft {
  bottom: 18px;
  left: 18px;
  max-width: 280px;
}

.bottomRight {
  right: 18px;
  bottom: 18px;
  max-width: 340px;
}

.overlayBadge {
  display: inline-flex;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(248, 251, 255, 0.16);
  color: var(--ds-color-text-on-dark);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.overlayTitle {
  margin-top: 16px;
  font-size: clamp(24px, 3vw, 34px);
  line-height: 1.05;
  font-weight: 700;
  color: var(--ds-color-text-on-dark);
}

.overlaySubtitle {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(247, 247, 242, 0.76);
}

.statsCard,
.focusCard,
.activityCard,
.centerOverlayCard {
  border-radius: 18px;
  background: rgba(16, 29, 52, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.statsCard,
.focusCard,
.activityCard {
  padding: 12px;
}

.statsGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(72px, 1fr));
  gap: 18px;
}

.statsLabel {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(247, 247, 242, 0.58);
}

.statsValue {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 700;
  color: var(--ds-color-text-on-dark);
}

.statsValueSmall {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--ds-color-text-on-dark);
  word-break: break-word;
}

.viewportCenter {
  position: absolute;
  inset: 0;
}

.viewport {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.focusTitle {
  margin-top: 8px;
  font-size: 15px;
  font-weight: 700;
  color: var(--ds-color-text-on-dark);
}

.focusMeta,
.activityCopy {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(247, 247, 242, 0.8);
}

.overlayButton {
  margin-top: 14px;
  min-height: 40px;
  padding: 0 14px;
  border: 0;
  border-radius: 12px;
  background: var(--ds-color-accent-500);
  color: var(--ds-color-text-on-brand);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.centerOverlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 3;
  pointer-events: none;
}

.centerOverlayCard {
  width: min(100%, 360px);
  padding: 24px;
  box-shadow: 0 22px 80px rgba(10, 18, 36, 0.22);
}

.centerOverlayTitle {
  color: var(--ds-color-text-on-dark);
  font-size: 20px;
  font-weight: 700;
}

.centerOverlayText {
  margin-top: 10px;
  color: rgba(247, 247, 242, 0.8);
  line-height: 1.5;
}

.progressText {
  margin-top: 14px;
  color: var(--ds-color-text-on-dark);
  font-weight: 700;
}

.hiddenInput {
  display: none;
}

@media (max-width: 900px) {
  .viewportCard,
  .viewportGrid {
    min-height: 460px;
  }

  .topRight,
  .bottomRight {
    right: 14px;
  }

  .topLeft,
  .bottomLeft {
    left: 14px;
  }
}

@media (max-width: 640px) {
  .topRight,
  .bottomLeft,
  .bottomRight {
    position: static;
    margin: 14px;
  }

  .topLeft {
    top: 14px;
    left: 14px;
    right: 14px;
    max-width: none;
  }

  .statsGrid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
}
</style>
