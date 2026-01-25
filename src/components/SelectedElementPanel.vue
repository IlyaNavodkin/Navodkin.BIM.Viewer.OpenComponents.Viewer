<template>
  <div v-if="selectedElements.length > 0" class="selected-element-panel">
    <div class="panel-header">Выделенные элементы:</div>
    <div class="panel-count">
      Выделено элементов: {{ selectedElements.length }}
    </div>
    <pre class="panel-json">{{ jsonContent }}</pre>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  selectedElements: any[];
}

const props = withDefaults(defineProps<Props>(), {
  selectedElements: () => [],
});

// Вычисляемое свойство для JSON
const jsonContent = computed(() => {
  return JSON.stringify(props.selectedElements, null, 2);
});
</script>

<style scoped>
.selected-element-panel {
  position: fixed;
  bottom: 20px;
  left: 20px;
  max-width: 500px;
  max-height: 400px;
  background: rgba(0, 0, 0, 0.9);
  border: 2px solid #bcf124;
  border-radius: 8px;
  padding: 15px;
  color: white;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 12px;
  z-index: 9999;
  overflow: auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

.panel-header {
  margin-bottom: 10px;
  font-weight: bold;
  color: #bcf124;
  font-size: 14px;
}

.panel-count {
  margin-bottom: 10px;
  font-size: 12px;
  color: #ccc;
}

.panel-json {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 11px;
  line-height: 1.4;
}
</style>
