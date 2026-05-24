<template>
  <aside
    class="sidebar-shell"
    :class="[
      `sidebar-shell-${side}`,
      `sidebar-shell-${variant}`,
      {
        'sidebar-shell-resizing': isResizing,
      },
    ]"
    :style="shellStyle"
  >
    <div class="sidebar-content">
      <slot />
    </div>

    <button
      v-if="resizable"
      type="button"
      class="resize-handle"
      :class="`resize-handle-${side}`"
      aria-label="Resize sidebar"
      @pointerdown="startResize"
    >
      <span class="resize-grip" />
    </button>
  </aside>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";

const widthModel = defineModel<number>("width", { required: true });

const props = withDefaults(
  defineProps<{
    maxWidth?: number;
    minWidth?: number;
    resizable?: boolean;
    side: "left" | "right";
    variant?: "docked" | "drawer";
  }>(),
  {
    maxWidth: 440,
    minWidth: 260,
    resizable: true,
    variant: "docked",
  }
);

const isResizing = ref(false);
const resizeStartX = ref(0);
const resizeStartWidth = ref(0);

const shellStyle = computed(() => ({
  width: `${widthModel.value}px`,
  minWidth: `${props.minWidth}px`,
  maxWidth: `${props.maxWidth}px`,
}));

function startResize(event: PointerEvent) {
  if (!props.resizable) {
    return;
  }

  isResizing.value = true;
  resizeStartX.value = event.clientX;
  resizeStartWidth.value = widthModel.value;

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", stopResize);
  document.body.style.userSelect = "none";
  document.body.style.cursor = "col-resize";
}

function onPointerMove(event: PointerEvent) {
  if (!isResizing.value) {
    return;
  }

  const delta = event.clientX - resizeStartX.value;
  const nextWidth =
    props.side === "left"
      ? resizeStartWidth.value + delta
      : resizeStartWidth.value - delta;

  widthModel.value = clampWidth(nextWidth);
}

function stopResize() {
  if (!isResizing.value) {
    return;
  }

  isResizing.value = false;
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", stopResize);
  document.body.style.userSelect = "";
  document.body.style.cursor = "";
}

function clampWidth(width: number) {
  return Math.min(props.maxWidth, Math.max(props.minWidth, width));
}

onBeforeUnmount(() => {
  stopResize();
});
</script>

<style scoped>
.sidebar-shell {
  position: relative;
  display: flex;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.sidebar-shell-docked {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(248, 251, 255, 0.94);
  backdrop-filter: blur(16px);
  box-shadow:
    0 24px 60px rgba(9, 19, 37, 0.18),
    inset 0 0 0 1px rgba(255, 255, 255, 0.2);
}

.sidebar-shell-drawer {
  border: 0;
  border-radius: 0;
  background: rgba(248, 251, 255, 0.98);
  backdrop-filter: blur(16px);
  box-shadow: none;
}

.sidebar-shell-left {
  border-radius: 24px 18px 18px 24px;
}

.sidebar-shell-right {
  border-radius: 18px 24px 24px 18px;
}

.sidebar-shell-drawer.sidebar-shell-left,
.sidebar-shell-drawer.sidebar-shell-right {
  border-radius: 0;
}

.sidebar-shell-resizing {
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--ds-color-brand-500) 30%, white),
    0 24px 60px rgba(9, 19, 37, 0.18);
}

.sidebar-shell-drawer.sidebar-shell-resizing {
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ds-color-brand-500) 30%, white);
}

.sidebar-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
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
.sidebar-shell-resizing .resize-grip {
  height: 88px;
  background: color-mix(in srgb, var(--ds-color-accent-500) 42%, white);
}
</style>
