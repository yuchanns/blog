import { defineComponent } from "vue"
import type { Post } from './posts.data.js'
import type { PropType } from 'vue'

export const PubDate = defineComponent({
  name: "Date",

  props: {
    date: Object as PropType<Post['date']>
  },

  setup({ date }) {
    const t = date?.time ?? ''
    const datetime = new Date(t).toISOString()
    return () =>
      <dl>
        <dt class="sr-only">Published on</dt>
        <dd class="text-base leading-6 font-medium text-gray-500 dark:text-gray-300">
          <time datetime={datetime}>{date?.string}</time>
        </dd>
      </dl >
  }
})
