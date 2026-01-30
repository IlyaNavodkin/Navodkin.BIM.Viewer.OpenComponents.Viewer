import { createPinia, setActivePinia } from "pinia";

// Единый экземпляр Pinia, чтобы его можно было переиспользовать
// в создаваемых динамически Vue-приложениях (например, маркеры через createApp()).
export const pinia = createPinia();

// Позволяет безопасно вызывать сторы вне setup()/компонентов (например, внутри сервисов/компосабл).
setActivePinia(pinia);

