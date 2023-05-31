import { defineConfig } from 'vitepress'
import { baseUrl, description, title } from './data.js'
import { genFeed } from './genFeed.js'
import { genSocial } from './genSocial.js'
import { markdownItBacklinks } from './theme/markdownItBacklinks.js'

export default defineConfig({
  title: title,
  description: description,
  cleanUrls: true,
  head: [
    ['meta', { name: 'twitter:site', content: baseUrl }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    [
      'link',
      {
        rel: 'icon',
        type: 'image/x-icon',
        href: '/favicon.ico'
      }
    ],
    [
      'script',
      {
        src: 'https://cdn.usefathom.com/script.js',
        'data-site': 'NYHGSGQV',
        'data-spa': 'auto',
        defer: ''
      }
    ]
  ],
  transformHead: genSocial,
  buildEnd: genFeed,
  markdown: {
    config: (md) => {
      md.use(markdownItBacklinks)
    }
  }
})
