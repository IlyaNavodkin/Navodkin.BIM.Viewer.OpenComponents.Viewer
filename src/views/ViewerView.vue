
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import LoadingOverlay from '../components/LoadingOverlay.vue';
import SelectedElementPanel from '../components/SelectedElementPanel.vue';
import { useIFCViewer } from '../composables/useIFCViewer';

const router = useRouter();
const containerRef = ref<HTMLElement | null>(null);
const { disposeViewer, setupViewer, selectedElements, loadingState } = useIFCViewer();

function goBack() {
  router.push('/');
}

onMounted(async () => {
  if (!containerRef.value) return;

  await setupViewer(containerRef.value);
});

onBeforeUnmount(() => {
  disposeViewer();
});
</script>

<template>
  <div class="viewer-container">
    <div class="full-screen" id="container" ref="containerRef"></div>
    <button @click="goBack" class="back-button">← Назад</button>
    <LoadingOverlay :isLoading="loadingState.isLoading" :progress="loadingState.progress"
      :modelName="loadingState.modelName"
    />
    <SelectedElementPanel :selectedElements="selectedElements" />
  </div>
</template>


<style scoped>
.viewer-container {
  position: relative;
  width: 100vw;
  height: 100vh;
}

.full-screen {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.back-button {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 10001;
  padding: 10px 20px;
  font-size: 16px;
  font-weight: bold;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: 2px solid #bcf124;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: "Plus Jakarta Sans", sans-serif;
}

.back-button:hover {
  background: rgba(0, 0, 0, 0.9);
  border-color: #a0d020;
}
</style>
