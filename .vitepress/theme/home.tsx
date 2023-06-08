import { defineComponent } from "vue"
import { PubDate } from './date.js'
import { data as posts } from './posts.data.js'
import { useData } from 'vitepress'


export const Home = defineComponent({
  name: "Home",

  setup() {
    const { frontmatter } = useData()

    return () =>
      <div class="divide-y divide-gray-200 dark:divide-slate-200/5">
        <div class="pt-6 pb-8 space-y-2 md:space-y-5">
          <h1
            class="text-3xl leading-9 font-extrabold text-gray-900 dark:text-white tracking-tight sm:text-4xl sm:leading-10 md:text-6xl md:leading-14"
          >
            {frontmatter.value.title}
          </h1>
          <p class="text-lg leading-7 text-gray-500 dark:text-white">
            {frontmatter.value.subtext}
          </p>
        </div>
        <ul class="divide-y divide-gray-200 dark:divide-slate-200/5">
          {posts.map(({ title, url, date, excerpt }) =>
            <li class="py-12">
              <article
                class="space-y-2 xl:grid xl:grid-cols-4 xl:space-y-0 xl:items-baseline"
              >
                <PubDate date={date} />
                <div class="space-y-5 xl:col-span-3">
                  <div class="space-y-6">
                    <h2 class="text-2xl leading-8 font-bold tracking-tight">
                      <a class="text-gray-900 dark:text-white" href={url}>
                        {title}
                      </a>
                    </h2>
                    {excerpt ?
                      <div
                        class="prose dark:prose-invert max-w-none text-gray-500 dark:text-gray-300"
                        v-html={excerpt}
                      ></div> : null}
                  </div>
                  <div class="text-base leading-6 font-medium">
                    <a class="link" aria-label="read more" href={url}>Read more →</a>
                  </div>
                </div>
              </article>
            </li>
          )}
        </ul >
      </div >

  }
})
