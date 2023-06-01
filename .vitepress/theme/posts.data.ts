import { createContentLoader } from 'vitepress'
import { Content, formatBacklink } from './markdownItBacklinks.js'

export interface Post {
  title: string
  url: string
  date: {
    time: number
    string: string
  }
  excerpt: string | undefined
  backlinks: Content['backlinks']
}

declare const data: Post[]
export { data }

export default createContentLoader('posts/*.md', {
  excerpt: true,
  render: true,
  includeSrc: true,
  transform(raw): Post[] {
    return raw
      .map(({ url, frontmatter, excerpt, src }) => {
        return ({
          title: frontmatter.title,
          url,
          excerpt: excerpt,
          date: formatDate(frontmatter.date),
          backlinks: formatBacklink(src).backlinks
        })
      })
      .sort((a, b) => b.date.time - a.date.time)
  }
})

function formatDate(raw: string): Post['date'] {
  const date = new Date(raw)
  date.setUTCHours(12)
  return {
    time: +date,
    string: date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
}

