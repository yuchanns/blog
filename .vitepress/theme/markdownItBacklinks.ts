import { PluginWithParams } from "markdown-it";

const regexp = /\[{2}\s*(.+?)\s*\]{2}/ig

function linkMatcher(cap: RegExpExecArray, vault: string) {
  const backlink = cap[1].split("|")
  const title = backlink[0]
  const path = `/${vault}/${backlink[backlink.length - 1]}`
  return { title, path }
}

function formatBacklink(raw: string | undefined): string {
  if (!raw) {
    return ""
  }
  let cap: RegExpExecArray | null
  while ((cap = regexp.exec(raw))) {
    const { title, path } = linkMatcher(cap, 'posts')
    raw = raw.slice(0, cap.index) + `<span class="backlink-bracket">&#91;&#91;</span><a class="backlink-route" href="${path}">${title}</a><span class="backlink-bracket">&#93;&#93;</span>` +
      raw.slice(cap.index + cap[0].length, raw.length)
  }
  return raw
}


export const markdownItBacklinks: PluginWithParams = (md): void => {
  md.core.ruler.after('normalize', 'backlinks', state => {
    state.src = (src => {
      return formatBacklink(src)
    })(state.src)
  })
}
