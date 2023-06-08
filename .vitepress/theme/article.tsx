import { computed, defineComponent, PropType } from 'vue'
import { PubDate } from './date.js'
import { Author } from './author.js'
import { Content, useData, useRouter } from 'vitepress'
import { data as posts, Post } from './posts.data.js'
import { postsPrefix } from '../data.js'

export const Article = defineComponent({
  name: "Author",

  props: {
    backlinkPosts: { type: Object as PropType<Post[]>, default: [] }
  },

  setup({ backlinkPosts }) {
    const { frontmatter: data, page } = useData()
    const r = useRouter()
    // We compare data only within the `posts/*` directory.
    // However, there could be additional posts elsewhere.
    // In such cases, `currentIndex` becomes -1,
    // resulting in an undefined `post`.
    const currentIndex = posts.findIndex((p) => p.url == r.route.path)

    const post = posts[currentIndex]
    const nextPost = posts[currentIndex - 1]
    const prevPost = posts[currentIndex + 1]

    const title = computed(() => {
      const title = page.value.isNotFound ?
        r.route.path.replace(`/${postsPrefix}/`, '') : data.value.title
      r.route.data.title = title
      return title
    })

    return () =>
      <article class="xl:divide-y xl:divide-gray-200 dark:xl:divide-slate-200/5">
        <header class="pt-6 xl:pb-10 space-y-1 text-center">
          {post ?
            <PubDate key={post.date.string} date={post.date} /> : null
          }
          <h1
            class="text-3xl leading-9 font-extrabold text-gray-900 dark:text-white tracking-tight sm:text-4xl sm:leading-10 md:text-5xl md:leading-14">
            {title.value}
          </h1>
        </header>

        <div class="divide-y xl:divide-y-0 divide-gray-200 dark:divide-slate-200/5 xl:grid xl:grid-cols-4 xl:gap-x-10 pb-16 xl:pb-20"
          style="grid-template-rows: auto 1fr">
          {data.value.author ?
            <Author /> : null
          }
          <div class="divide-y divide-gray-200 dark:divide-slate-200/5 xl:pb-0 xl:col-span-3 xl:row-span-2">
            {!page.value.isNotFound ?
              <Content class="prose dark:prose-invert max-w-none pt-10 pb-8" /> : null
            }
            <div class="prose dark:prose-invert max-w-none pb-10">
              <h2 class="text-lg text-gray-500 font-bold pt-10">
                {backlinkPosts.length} Linked Reference(s)
              </h2>
              {backlinkPosts.length > 0 ?
                <div class="text-sm max-w-none">
                  {backlinkPosts.map(post =>
                    <div class="rounded border px-3 drop-shadow-md mb-3">
                      <h2 class="cursor-pointer" onClick={() => r.go(post.url)}>{post.title}</h2>
                      <div v-html={post.excerpt} />
                    </div>
                  )}
                </div> : null}
            </div>
          </div>
          <footer
            class="text-sm font-medium leading-5 divide-y divide-gray-200 dark:divide-slate-200/5 xl:col-start-1 xl:row-start-2">
            {(!page.value.isNotFound && nextPost) ?
              <div class="py-8">
                <h2 class="text-xs tracking-wide uppercase text-gray-500 dark:text-white">
                  Next Article
                </h2>
                <div class="link">
                  <a href={nextPost.url}>{nextPost.title}</a>
                </div>
              </div> : null
            }
            {(!page.value.isNotFound && prevPost) ?
              <div class="py-8">
                <h2 class="text-xs tracking-wide uppercase text-gray-500 dark:text-white">
                  Previous Article
                </h2>
                <div class="link">
                  <a href={prevPost.url}>{prevPost.title}</a>
                </div>
              </div> : null
            }
            <div class="pt-8">
              <a class="link" href="/">← Back to the blog</a>
            </div>
          </footer >
        </div >
      </article >

  }
})
