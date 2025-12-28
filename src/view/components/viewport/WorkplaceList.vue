<script lang="ts" setup>
import type { ElementData } from "../composables/viewer";
import WorkplaceCard from "./WorkplaceCard.vue";

interface Props {
  elements: ElementData[];
  selectedElementId?: number | null;
}

const props = withDefaults(defineProps<Props>(), {
  selectedElementId: null,
});

const emit = defineEmits<{
  elementClick: [localId: number];
  elementMouseEnter: [localId: number];
  elementMouseLeave: [localId: number];
}>();

/**
 * Проверяет, является ли элемент выбранным
 */
const isElementSelected = (element: ElementData): boolean => {
  return props.selectedElementId !== null && props.selectedElementId === element.LocalId;
};

const handleCardClick = (element: ElementData) => {
  emit("elementClick", element.LocalId);
};

const handleCardMouseEnter = (element: ElementData) => {
  emit("elementMouseEnter", element.LocalId);
};

const handleCardMouseLeave = (element: ElementData) => {
  emit("elementMouseLeave", element.LocalId);
};
</script>

<template>
  <div :class="$style.list">
    <WorkplaceCard
      v-for="element in elements"
      :key="element.LocalId"
      :element="element"
      :isSelected="isElementSelected(element)"
      @click="handleCardClick"
      @mouseenter="handleCardMouseEnter"
      @mouseleave="handleCardMouseLeave"
    />
  </div>
</template>

<style module lang="scss">
.list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>

