import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ViewerView from '../views/ViewerView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/viewer',
      name: 'viewer',
      component: ViewerView
    }
  ]
})

export default router
