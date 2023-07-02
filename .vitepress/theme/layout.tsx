import { computed, defineComponent } from "vue"
import { useData, useRouter } from 'vitepress'
import { Home } from './home.js'
import { Article } from './article.js'
import { NotFound } from './notfound.js'
import { data as posts } from './posts.data.js'
import { title } from "../data.js"


export const Layout = defineComponent({
  name: "Layout",

  setup() {
    const { page, frontmatter } = useData()
    // There are two types of post pages:
    // 1. Posts with a corresponding markdown file on the disk
    // 2. Posts without an md file but referenced by other posts
    // We need to create a dummy page for the second type to list all its backlinks.
    const r = useRouter()
    const backlinkPosts = computed(() => posts.filter((p) =>
      p.backlinks.find(url => url == r.route.path)))

    return () =>
      <div class="antialiased dark:bg-slate-900">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 xl:max-w-5xl xl:px-0">
          <nav class="flex justify-between items-center py-10 font-bold">
            <a class="text-xl" href="/" aria-label="Code Alchemy Academy">
              <img
                class="inline-block mr-2"
                style="width: 36px; height: 36px"
                alt="logo"
                src="https://user-images.githubusercontent.com/25029451/248530466-f035ce79-04f4-4c1c-92fc-2ccb792b79e6.png"
              />
              {!frontmatter.value.index ?
                <span class="hidden md:inline dark:text-white"
                >{title}</span> : null
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
                rel="me"
                class="hover:text-gray-700 dark:hover:text-gray-200"
                href="https://ani.work/@yuchanns"
                target="_blank"
              >Mastodon</a>
              <span class="mr-2 ml-2">·</span>
              <a
                class="hover:text-gray-700 dark:hover:text-gray-200"
                href="/feed.rss"
              >RSS<span class="hidden sm:inline"> Feed</span></a
              >
            </div>
          </nav>
        </div>
        <main class="max-w-3xl mx-auto px-4 sm:px-6 xl:max-w-5xl xl:px-0">
          {frontmatter.value.index ?
            <Home /> : (
              page.value.isNotFound && backlinkPosts.value.length == 0 ?
                <NotFound /> :
                <Article key={page.value.title} backlinkPosts={backlinkPosts.value} />
            )}
        </main>
      </div>
  }
})
