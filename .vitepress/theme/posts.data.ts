import { createContentLoader } from 'vitepress'

export interface Post {
  title: string
  url: string
  date: {
    time: number
    string: string
  }
  excerpt: string | undefined
}

declare const data: Post[]
export { data }

export default createContentLoader('posts/*.md', {
  excerpt: true,
  transform(raw): Post[] {
    return raw
      .map(({ url, frontmatter, excerpt }) => ({
        title: frontmatter.title,
        url,
        excerpt: formatBacklink(excerpt),
        date: formatDate(frontmatter.date)
      }))
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

const regexp = /\[{2}\s*(.+?)\s*\]{2}/ig

function linkMatcher(cap: RegExpExecArray) {
  const backlink = cap[1].split("|")
  const title = backlink[0]
  const path = `/posts/${backlink[backlink.length - 1]}`
  return { title, path }
}

function formatBacklink(raw: string | undefined): Post['excerpt'] {
  if (!raw) {
    return ''
  }
  let cap: RegExpExecArray | null
  while ((cap = regexp.exec(raw))) {
    const { title, path } = linkMatcher(cap)
    raw = raw.slice(0, cap.index) + `<span class="backlink-bracket">&#91;&#91;</span><a href="${path}">${title}</a><span class="backlink-bracket">&#93;&#93;</span>` +
      raw.slice(cap.index + cap[0].length, raw.length)
  }
  return raw
}
