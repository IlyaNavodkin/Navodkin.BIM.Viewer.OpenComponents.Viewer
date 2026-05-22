import { createRouter, createWebHistory } from "vue-router";
import BrandTokensView from "../views/BrandTokensView.vue";
import HomeView from "../views/HomeView.vue";
import QuasarComponentsView from "../views/QuasarComponentsView.vue";
import QuasarFormView from "../views/QuasarFormView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/quasar-form",
      name: "quasar-form",
      component: QuasarFormView,
    },
    {
      path: "/quasar-components",
      name: "quasar-components",
      component: QuasarComponentsView,
    },
    {
      path: "/brand-tokens",
      name: "brand-tokens",
      component: BrandTokensView,
    },
  ],
});

export default router;
