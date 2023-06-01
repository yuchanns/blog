import { HeadConfig } from "vitepress"
import { TransformContext } from "vitepress"
import { baseUrl, defaultAuthor, image } from "./data.js"

export async function genSocial(ctx: TransformContext) {
  const head = [] as HeadConfig[]
  head.push(['meta', { name: 'twitter:image', content: ctx.pageData.frontmatter.image ?? image }])
  head.push(['meta', { name: 'twitter:creator', content: ctx.pageData.frontmatter.author ?? defaultAuthor }])
  head.push(['meta', { property: 'og:url', content: `${baseUrl}/` + ctx.pageData.relativePath.replace(/((^|\/)index)?\.md$/, '$2') }])
  head.push(['meta', { property: 'og:title', content: ctx.pageData.title }])
  head.push(['meta', { property: 'og:description', content: ctx.pageData.description }])
  head.push(['meta', { property: 'og:image', content: ctx.pageData.frontmatter.image ?? image }])
  return head
}
