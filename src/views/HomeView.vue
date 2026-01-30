<template>
  <div class="home-view">
    <div class="home-content">
      <h1>IFC Viewer</h1>
      <p>Просмотр 3D моделей IFC</p>
      <div class="buttons">
        <button @click="goToViewer" class="viewer-button">Открыть вьюер</button>
        <button @click="goToDemo" class="demo-button">ShallowRef Demo</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

function goToViewer() {
  router.push("/viewer");
}

function goToDemo() {
  router.push("/shallow-ref-demo");
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

.buttons {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
}

.viewer-button,
.demo-button {
  padding: 15px 40px;
  font-size: 18px;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: "Plus Jakarta Sans", sans-serif;
}

.viewer-button {
  background: #bcf124;
  color: #000;
}

.viewer-button:hover {
  background: #a0d020;
  transform: scale(1.05);
}

.viewer-button:active {
  transform: scale(0.98);
}

.demo-button {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid white;
}

.demo-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.demo-button:active {
  transform: scale(0.98);
}
</style>
