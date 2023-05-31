import { TransformContext } from "vitepress"
import { baseUrl, defaultAuthor, image } from "./data.js"

export async function genSocial(ctx: TransformContext) {
  ctx.head.push(['meta', { name: 'twitter:image', content: ctx.pageData.frontmatter.image ?? image }])
  ctx.head.push(['meta', { name: 'twitter:creator', content: ctx.pageData.frontmatter.author ?? defaultAuthor }])
  ctx.head.push(['meta', { property: 'og:url', content: `${baseUrl}/` + ctx.pageData.relativePath.replace(/((^|\/)index)?\.md$/, '$2') }])
  ctx.head.push(['meta', { property: 'og:title', content: ctx.pageData.title }])
  ctx.head.push(['meta', { property: 'og:description', content: ctx.pageData.description }])
  ctx.head.push(['meta', { property: 'og:image', content: ctx.pageData.frontmatter.image ?? image }])
}
