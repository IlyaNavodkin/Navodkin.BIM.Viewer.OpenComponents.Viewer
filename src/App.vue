<template>
  <div id="app">
    <div class="header">
      <h1>Multi-Instance Viewer Test - 2 Independent Viewers</h1>
      <div class="controls">
        <button @click="handleGreet">Greet</button>
        <button @click="handleGetComponent">Get Component</button>
        <p v-if="message">{{ message }}</p>
      </div>
    </div>
    <div class="viewers-container">
      <div v-if="viewerId" class="viewer-wrapper">
        <div class="viewer-label">Viewer 1: {{ viewerId }}</div>
        <EmployeeWorkplaceViewer :viewer-id="viewerId" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import * as OBC from "@thatopen/components";
import { v4 as uuidv4 } from "uuid";
import { HelloWorldComponent } from "@/view-models/components";
import { useViewerManagerStore } from "@/stores/useViewerManagerStore";
import EmployeeWorkplaceViewer from "@/view/components/viewport/EmployeeWorkplaceViewer.vue";

// ID вьюверов будут сгенерированы в onMounted
const viewerId = ref<string>("");

const message = ref<string>("");
let components: OBC.Components | null = null;
let helloWorldComponent: HelloWorldComponent | null = null;

onMounted(async () => {
  // Генерируем уникальные ID для каждого вьювера
  viewerId.value = uuidv4();

  components = new OBC.Components();

  helloWorldComponent = new HelloWorldComponent(components);

  helloWorldComponent.onBeforeUpdate.add(() => {
    console.log("Component preparing to update");
  });

  helloWorldComponent.onAfterUpdate.add(() => {
    console.log("Component updated");
  });

  message.value = "HelloWorld component created and registered!";
});

onUnmounted(() => {
  // Dispose вьюверов
  const viewerManager = useViewerManagerStore();
  if (viewerId.value) {
    viewerManager.disposeViewer(viewerId.value);
  }

  // Dispose компонентов
  if (helloWorldComponent) {
    helloWorldComponent.dispose();
  }
  if (components) {
    components.dispose();
  }
});

const handleGreet = () => {
  if (helloWorldComponent) {
    helloWorldComponent.greet("Developer");
    message.value = "Check browser console!";
  }
};

const handleGetComponent = async () => {
  if (components) {
    const hwComponent = await components.get(HelloWorldComponent);
    if (hwComponent) {
      hwComponent.greet("Retrieved via get()");
      message.value = "Component retrieved via components.get()!";
    }
  }
};
</script>

<style scoped>
#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 0;
  margin: 0;
  font-family: Arial, sans-serif;
  overflow: hidden;
}

.header {
  padding: 20px;
  background-color: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.header h1 {
  margin: 0 0 15px 0;
  font-size: 20px;
  color: #2c3e50;
}

.controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

button {
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #35a372;
}

p {
  margin: 0;
  padding: 8px;
  background-color: #f0f0f0;
  border-radius: 4px;
  font-size: 12px;
}

.viewers-container {
  flex: 1;
  display: flex;
  gap: 20px;
  padding: 20px;
  overflow: hidden;
  min-height: 0;
}

.viewer-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 2px solid #667eea;
  border-radius: 8px;
  overflow: hidden;
  background: #f9f9f9;
}

.viewer-label {
  padding: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  font-size: 12px;
  text-align: center;
  letter-spacing: 0.5px;
  font-family: "Courier New", monospace;
}
</style>
