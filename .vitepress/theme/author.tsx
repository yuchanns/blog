import { defineComponent } from "vue"
import { useData } from 'vitepress'


export const Author = defineComponent({
  name: "Author",

  setup() {
    const { frontmatter } = useData()

    return () =>
      <dl class="pt-6 pb-10 xl:pt-11 xl:border-b xl:border-gray-200 dark:xl:border-slate-200/5">
        <dt class="sr-only">Authors</dt>
        <dd>
          <ul
            class="flex justify-center xl:block space-x-8 sm:space-x-12 xl:space-x-0 xl:space-y-8"
          >
            <li class="flex items-center space-x-2">
              {frontmatter.value.gravatar ?
                <img
                  src={"https://gravatar.com/avatar/" + frontmatter.value.gravatar}
                  alt="author image"
                  class="w-10 h-10 rounded-full"
                /> : null
              }
              {frontmatter.value.avatar ?
                <img
                  src={frontmatter.value.avatar}
                  alt="author image"
                  class="w-10 h-10 rounded-full"
                /> : null
              }
              <dl class="text-sm font-medium leading-5 whitespace-nowrap">
                <dt class="sr-only">Name</dt>
                <dd class="text-gray-900 dark:text-white">{frontmatter.value.author}</dd>
                {frontmatter.value.twitter ?
                  <dt class="sr-only">Twitter</dt> : null
                }
                {frontmatter.value.twitter ?
                  <dd>
                    <a
                      href={"https://twitter.com/" + frontmatter.value.twitter}
                      target="_blank"
                      rel="noopnener noreferrer"
                      class="link"
                    >{frontmatter.value.twitter}</a>
                  </dd> : null
                }
              </dl>
            </li>
          </ul>
        </dd>
      </dl >

  }
})
