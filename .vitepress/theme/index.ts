import './style.css'
import { Layout } from './layout.js'
import { defineAsyncComponent } from 'vue'
import { Theme } from 'vitepress'

const theme: Theme = {
  Layout: Layout,
  enhanceApp: ({ app }) => {
    app.component('Tweet', defineAsyncComponent(() => import('vue-tweet')))
  }
}

export default theme
