import { defineComponent } from "vue"

export const NotFound = defineComponent({
  name: "NotFound",

  setup() {
    return () =>
      <h1 class="text-3xl font-bold">404 Page Not Found</h1>
  }
})
