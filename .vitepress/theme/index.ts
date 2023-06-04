import './style.css'
import { Layout } from './layout.js'
import { defineClientComponent, Theme } from 'vitepress'

const theme: Theme = {
  Layout: Layout,
  enhanceApp: ({ app }) => {
    app.component('Tweet', defineClientComponent(() => import('vue-tweet')))
  }
}

export default theme
