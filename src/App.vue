<template>
  <div id="app">
    <div class="header">
      <h1>Vue + Pinia + TypeScript + ThatOpen Components</h1>
      <div class="controls">
        <button @click="handleGreet">Greet</button>
        <button @click="handleGetComponent">Get Component</button>
        <p v-if="message">{{ message }}</p>
      </div>
    </div>
    <div class="viewport-container">
      <EmployeeWorkplaceViewer />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import * as OBC from "@thatopen/components";
import { HelloWorldComponent } from "@/view-models/components";
import EmployeeWorkplaceViewer from "@/view/components/viewport/EmployeeWorkplaceViewer.vue";

const message = ref<string>("");
let components: OBC.Components | null = null;
let helloWorldComponent: HelloWorldComponent | null = null;

onMounted(async () => {
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
  font-size: 24px;
  color: #2c3e50;
}

.controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

button {
  padding: 10px 20px;
  font-size: 16px;
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
  padding: 10px;
  background-color: #f0f0f0;
  border-radius: 4px;
  font-size: 14px;
}

.viewport-container {
  flex: 1;
  padding: 20px;
  overflow: hidden;
  display: flex;
  min-height: 0;
}
</style>
