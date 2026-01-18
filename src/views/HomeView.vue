<template>
  <div class="home-view">
    <div class="home-content">
      <h1>IFC Viewer</h1>
      <p>Просмотр 3D моделей IFC</p>
      <button @click="goToViewer" class="viewer-button">
        Открыть вьюер
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goToViewer() {
  router.push('/viewer')
}
</script>

<style scoped>
.home-view {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-family: "Plus Jakarta Sans", sans-serif;
}

.home-content {
  text-align: center;
}

.home-content h1 {
  font-size: 48px;
  margin-bottom: 20px;
}

.home-content p {
  font-size: 24px;
  margin-bottom: 40px;
  opacity: 0.9;
}

.viewer-button {
  padding: 15px 40px;
  font-size: 18px;
  font-weight: bold;
  background: #bcf124;
  color: #000;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: "Plus Jakarta Sans", sans-serif;
}

.viewer-button:hover {
  background: #a0d020;
  transform: scale(1.05);
}

.viewer-button:active {
  transform: scale(0.98);
}
</style>
