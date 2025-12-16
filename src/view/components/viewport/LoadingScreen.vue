<template>
  <div :class="$style.loadingScreen">
    <div :class="$style.loadingContent">
      <div :class="$style.spinner"></div>
      <div :class="$style.loadingText">Загрузка модели...</div>
      <div :class="$style.progressBar">
        <div
          :class="$style.progressFill"
          :style="{ width: `${progress}%` }"
        ></div>
      </div>
      <div :class="$style.progressText">{{ progress }}%</div>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  progress: number;
}>();
</script>

<style module lang="scss">
.loadingScreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.loadingContent {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 40px;
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  min-width: 300px;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loadingText {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.progressBar {
  width: 100%;
  height: 8px;
  background-color: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progressFill {
  height: 100%;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progressText {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}
</style>

