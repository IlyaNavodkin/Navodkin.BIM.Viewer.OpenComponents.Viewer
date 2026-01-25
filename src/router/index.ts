import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import ViewerView from "../views/ViewerView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/viewer/:employeeId?",
      name: "viewer",
      component: ViewerView,
    },
    // Backward compatibility: old/deep-link format
    {
      path: "/viewer/employee/:employeeId",
      name: "viewer-employee",
      redirect: (to) => ({
        name: "viewer",
        params: { employeeId: to.params.employeeId },
      }),
    },
  ],
});

export default router;
