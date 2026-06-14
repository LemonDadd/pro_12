import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import HomePage from './views/HomePage.vue'
import LevelsPage from './views/LevelsPage.vue'
import SettingsPage from './views/SettingsPage.vue'
import GamePage from './views/GamePage.vue'
import './styles/global.css'

const routes = [
  { path: '/', component: HomePage },
  { path: '/play/campaign/:id', component: GamePage, props: true },
  { path: '/play/endless', component: GamePage, props: { endless: true } },
  { path: '/levels', component: LevelsPage },
  { path: '/settings', component: SettingsPage }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

const app = createApp(App)
app.use(router)
app.mount('#app')
