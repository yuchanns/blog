import { defineConfig } from 'vitepress'
import { genFeed } from './genFeed.js'
import { markdownItBacklinks } from './theme/markdownItBacklinks.js'

export default defineConfig({
  title: 'Code Alchemy Academy',
  description: 'Opinions are my own.',
  cleanUrls: true,
  head: [
    ['meta', { name: 'twitter:site', content: '@realyuchanns' }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    [
      'meta',
      {
        name: 'twitter:image',
        content: 'https://avatars.githubusercontent.com/u/25029451'
      }
    ],
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
  buildEnd: genFeed,
  markdown: {
    config: (md) => {
      md.use(markdownItBacklinks)
    }
  }
})
