import './assets/main.css'
import { createApp } from 'vue'
import App from './App.vue'
import p5 from 'p5'

window.p5 = p5

const app = createApp(App)

app.mount('#app')
