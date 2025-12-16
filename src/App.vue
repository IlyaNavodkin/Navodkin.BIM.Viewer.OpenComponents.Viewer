<template>
  <div id="app">
    <div class="header">
      <h1>Vue + Pinia + TypeScript + ThatOpen Components</h1>
      <div class="controls">
        <button @click="handleGreet">Поприветствовать</button>
        <button @click="handleGetComponent">Получить компонент</button>
        <p v-if="message">{{ message }}</p>
      </div>
    </div>
    <div class="viewport-container">
      <TestingViewport />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import * as OBC from "@thatopen/components";
import { HelloWorldComponent } from "@/view-models/components";
import TestingViewport from "@/view/components/viewport/TestingViewport.vue";

const message = ref<string>("");
let components: OBC.Components | null = null;
let helloWorldComponent: HelloWorldComponent | null = null;

onMounted(async () => {
  // Создаем экземпляр Components
  components = new OBC.Components();

  // Создаем наш компонент
  helloWorldComponent = new HelloWorldComponent(components);

  // Подписываемся на события обновления
  helloWorldComponent.onBeforeUpdate.add(() => {
    console.log("Компонент готовится к обновлению");
  });

  helloWorldComponent.onAfterUpdate.add(() => {
    console.log("Компонент обновлен");
  });

  message.value = "Компонент HelloWorld создан и зарегистрирован!";
});

onUnmounted(() => {
  // Освобождаем ресурсы при размонтировании компонента Vue
  if (helloWorldComponent) {
    helloWorldComponent.dispose();
  }
  if (components) {
    components.dispose();
  }
});

const handleGreet = () => {
  if (helloWorldComponent) {
    helloWorldComponent.greet("Разработчик");
    message.value = "Проверьте консоль браузера!";
  }
};

const handleGetComponent = async () => {
  if (components) {
    // Демонстрация получения компонента через get()
    const hwComponent = await components.get(HelloWorldComponent);
    if (hwComponent) {
      hwComponent.greet("Получен через get()");
      message.value = "Компонент получен через components.get()!";
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
