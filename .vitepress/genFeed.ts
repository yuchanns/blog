import path from 'path'
import { writeFileSync } from 'fs'
import { Feed } from 'feed'
import { createContentLoader, type SiteConfig } from 'vitepress'
import { title } from 'process'
import { description, baseUrl, lang, image, favicon, copyright, postsPrefix } from './data.js'

export async function genFeed(config: SiteConfig) {
  const feed = new Feed({
    title: title,
    description: description,
    id: baseUrl,
    link: baseUrl,
    language: lang,
    image: image,
    favicon: favicon,
    copyright: copyright
  })

  const posts = await createContentLoader(`${postsPrefix}/*.md`, {
    excerpt: true,
    render: true
  }).load()

  posts.sort(
    (a, b) =>
      +new Date(b.frontmatter.date as string) -
      +new Date(a.frontmatter.date as string)
  )

  for (const { url, excerpt, frontmatter, html } of posts) {
    feed.addItem({
      title: frontmatter.title,
      id: `${baseUrl}${url}`,
      link: `${baseUrl}${url}`,
      description: excerpt,
      content: html,
      author: [
        {
          name: frontmatter.author,
          link: frontmatter.twitter
            ? `https://twitter.com/${frontmatter.twitter}`
            : undefined
        }
      ],
      date: frontmatter.date
    })
  }

  writeFileSync(path.join(config.outDir, 'feed.rss'), feed.rss2())
}
