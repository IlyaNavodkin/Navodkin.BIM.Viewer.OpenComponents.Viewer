<template>
  <div v-if="isLoading" class="loading-overlay">
    <div class="loading-content">
      <h2 class="loading-model-name">
        {{ modelName || "Загрузка модели..." }}
      </h2>
      <div class="progress-container">
        <div class="progress-bar" :style="{ width: `${progress}%` }"></div>
      </div>
      <div class="progress-text">{{ progress }}%</div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  isLoading: boolean;
  progress: number;
  modelName?: string | null;
}

withDefaults(defineProps<Props>(), {
  isLoading: false,
  progress: 0,
  modelName: null,
});
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  color: white;
  font-family: "Plus Jakarta Sans", sans-serif;
}

.loading-content {
  text-align: center;
  max-width: 400px;
  padding: 20px;
}

.loading-model-name {
  margin-bottom: 20px;
  font-size: 24px;
}

.progress-container {
  width: 100%;
  height: 30px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 15px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-bar {
  height: 100%;
  background: #4caf50;
  width: 0%;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 18px;
  font-weight: bold;
}
</style>
