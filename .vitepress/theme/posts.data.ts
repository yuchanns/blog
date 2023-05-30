import { createContentLoader } from 'vitepress'

export interface Post {
  title: string
  url: string
  date: {
    time: number
    string: string
  }
  excerpt: string | undefined
  backlinks: string[]
}

declare const data: Post[]
export { data }

export default createContentLoader('posts/*.md', {
  excerpt: true,
  render: true,
  transform(raw): Post[] {
    return raw
      .map(({ url, frontmatter, excerpt, html }) => {
        return ({
          title: frontmatter.title,
          url,
          excerpt: excerpt,
          date: formatDate(frontmatter.date),
          backlinks: matchBacklinks(html)
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

const regexp = /<a\s+class="backlink-route"\s+href="([^"]+)"/

function matchBacklinks(raw: string | undefined): string[] {
  const backlinks = [] as string[]
  if (!raw) {
    return backlinks
  }
  let match: RegExpExecArray | null
  while ((match = regexp.exec(raw))) {
    backlinks.push(match[1])
    raw = raw.slice(match.index + match[0].length, raw.length)
  }

  return backlinks
}
