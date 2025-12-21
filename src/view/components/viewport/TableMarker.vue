<script lang="ts" setup>
defineProps<{
  localId: number;
}>();
</script>

<template>
  <div :class="$style.container">
    {{ localId }}
  </div>
</template>

<style module lang="scss">
.container {
  display: flex;
  align-items: center;
  background-color: rgba(168, 15, 15, 0.95);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  justify-content: center;
  min-width: 50px;
  min-height: 50px;
  color: #ffffff;
  border-radius: 50%;
}
</style>
