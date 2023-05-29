import { defineComponent } from "vue"
import { useData } from 'vitepress'
import { Home } from './home.js'
import { Article } from './article.js'
import { NotFound } from './notfound.js'


export const Layout = defineComponent({
  name: "Layout",

  setup() {
    const { page, frontmatter } = useData()

    return () =>
      <div class="antialiased dark:bg-slate-900">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 xl:max-w-5xl xl:px-0">
          <nav class="flex justify-between items-center py-10 font-bold">
            <a class="text-xl" href="/" aria-label="Code Alchemy Academy">
              <img
                class="inline-block mr-2"
                style="width: 36px; height: 36px"
                alt="logo"
                src="https://avatars.githubusercontent.com/u/25029451"
              />
              {(!frontmatter.value.index) &&
                <span
                  class="hidden md:inline dark:text-white"
                >Code Alchemy Academy</span>
              }
            </a>
            <div class="text-sm text-gray-500 dark:text-white leading-5">
              <a
                class="hover:text-gray-700 dark:hover:text-gray-200"
                href="https://github.com/yuchanns/blog"
                target="_blank"
                rel="noopener"
              ><span class="hidden sm:inline">GitHub </span>Source</a
              >
              <span class="mr-2 ml-2">·</span>
              <a
                class="hover:text-gray-700 dark:hover:text-gray-200"
                href="/feed.rss"
              >RSS<span class="hidden sm:inline"> Feed</span></a
              >
              <span class="mr-2 ml-2">·</span>
              <a
                class="hover:text-gray-700 dark:hover:text-gray-200"
                href="https://yuchanns.xyz"
                target="_blank"
                rel="noopener"
              >yuchanns.xyz →</a
              >
            </div>
          </nav>
        </div>
        <main class="max-w-3xl mx-auto px-4 sm:px-6 xl:max-w-5xl xl:px-0">
          {frontmatter.value.index ? <Home /> : (page.value.isNotFound ? <NotFound /> : <Article />)}
        </main>
      </div>
  }
})
