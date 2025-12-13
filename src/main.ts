import { createApp } from "vue";
import App from "./App.vue";
import { createPinia } from "pinia";

// Глобальные стили
import "./styles.css";

const pinia = createPinia();

createApp(App).use(pinia).mount("#app");
