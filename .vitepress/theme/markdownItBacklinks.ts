import { PluginWithParams } from "markdown-it"
import { postsPrefix } from "../data.js"

const regexp = /\[{2}\s*(.+?)\s*\]{2}/ig

export interface Content {
  post: string,
  backlinks: string[]
}

function linkMatcher(cap: RegExpExecArray, vault: string) {
  const backlink = cap[1].split("|")
  const title = backlink[0]
  const path = `/${vault}/${backlink[backlink.length - 1]}`
  return { title, path }
}

export function formatBacklink(raw: string | undefined): Content {
  const content = { post: "", backlinks: [] } as Content
  if (!raw) {
    return content
  }
  let cap: RegExpExecArray | null
  while ((cap = regexp.exec(raw))) {
    const { title, path } = linkMatcher(cap, postsPrefix)
    content.backlinks.push(path)
    raw = raw.slice(0, cap.index) + `<span class="backlink-bracket">&#91;&#91;</span><a class="backlink-route" href="${path}">${title}</a><span class="backlink-bracket">&#93;&#93;</span>` +
      raw.slice(cap.index + cap[0].length, raw.length)
  }
  content.post = raw
  return content
}


export const markdownItBacklinks: PluginWithParams = (md): void => {
  md.core.ruler.after('normalize', 'backlinks', state => {
    state.src = (src => {
      return formatBacklink(src).post
    })(state.src)
  })
}
