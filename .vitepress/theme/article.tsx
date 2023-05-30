import { defineComponent } from "vue"
import { PubDate } from './date.js'
import { Author } from './author.js'
import { Content, useData, useRoute } from 'vitepress'
import { data as posts } from './posts.data.js'

export const Article = defineComponent({
  name: "Author",

  setup() {
    const { frontmatter: data } = useData()
    const route = useRoute()
    const currentIndex = posts.findIndex((p) => p.url == route.path)

    const post = posts[currentIndex]
    const nextPost = posts[currentIndex - 1]
    const prevPost = posts[currentIndex + 1]
    const backlinkPosts = posts.filter((p) =>
      p.backlinks.find(url => url == post.url))

    return () =>
      <article class="xl:divide-y xl:divide-gray-200 dark:xl:divide-slate-200/5">
        <header class="pt-6 xl:pb-10 space-y-1 text-center">
          <PubDate key={post.date.string} date={post.date} />
          <h1
            class="text-3xl leading-9 font-extrabold text-gray-900 dark:text-white tracking-tight sm:text-4xl sm:leading-10 md:text-5xl md:leading-14">
            {data.value.title}
          </h1>
        </header>

        <div class="divide-y xl:divide-y-0 divide-gray-200 dark:divide-slate-200/5 xl:grid xl:grid-cols-4 xl:gap-x-10 pb-16 xl:pb-20"
          style="grid-template-rows: auto 1fr">
          <Author />
          <div class="divide-y divide-gray-200 dark:divide-slate-200/5 xl:pb-0 xl:col-span-3 xl:row-span-2">
            <Content class="prose dark:prose-invert max-w-none pt-10 pb-8" />
            <div class="backlinks-group">
              <h2 class="backlinks-header">
                {backlinkPosts.length} Linked Reference(s)
              </h2>
              {backlinkPosts.length > 0 &&
                <div class="backlinks">
                  {backlinkPosts.map(post =>
                    <div class="backlink">
                      <a href={post.url}>
                        <h2>{post.title}</h2>
                        <div class="backlink-body" v-html={post.excerpt} />
                      </a>
                    </div>
                  )}
                </div>}
            </div>
          </div>
          <footer
            class="text-sm font-medium leading-5 divide-y divide-gray-200 dark:divide-slate-200/5 xl:col-start-1 xl:row-start-2">
            {nextPost &&
              <div class="py-8">
                <h2 class="text-xs tracking-wide uppercase text-gray-500 dark:text-white">
                  Next Article
                </h2>
                <div class="link">
                  <a href={nextPost.url}>{nextPost.title}</a>
                </div>
              </div>
            }
            {prevPost &&
              <div class="py-8">
                <h2 class="text-xs tracking-wide uppercase text-gray-500 dark:text-white">
                  Previous Article
                </h2>
                <div class="link">
                  <a href={prevPost.url}>{prevPost.title}</a>
                </div>
              </div>
            }
            <div class="pt-8">
              <a class="link" href="/">← Back to the blog</a>
            </div>
          </footer >
        </div >
      </article >

  }
})
