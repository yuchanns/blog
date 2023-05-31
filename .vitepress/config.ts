import { defineConfig } from 'vitepress'
import { genFeed } from './genFeed.js'
import { markdownItBacklinks } from './theme/markdownItBacklinks.js'

const baseURL = 'https://blog.yuchanns.xyz'
const defaultImage = 'https://avatars.githubusercontent.com/u/25029451'

export default defineConfig({
  title: 'Code Alchemy Academy',
  description: 'Opinions are my own.',
  cleanUrls: true,
  head: [
    ['meta', { name: 'twitter:site', content: baseURL }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:creator', content: 'yuchanns' }],
    [
      'meta',
      {
        name: 'twitter:image',
        content: defaultImage
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
  transformHead: async (ctx) => {
    if (!ctx.pageData.relativePath.startsWith('posts/')) {
      return
    }
    ctx.head.push(['meta', { property: 'og:url', content: `${baseURL}/` + ctx.pageData.relativePath.replace(/((^|\/)index)?\.md$/, '$2') }])
    ctx.head.push(['meta', { property: 'og:title', content: ctx.pageData.title }])
    ctx.head.push(['meta', { property: 'og:description', content: ctx.pageData.description }])
    ctx.head.push(['meta', { property: 'og:image', content: ctx.pageData.frontmatter['image'] ?? defaultImage }])
  },
  buildEnd: genFeed,
  markdown: {
    config: (md) => {
      md.use(markdownItBacklinks)
    }
  }
})
