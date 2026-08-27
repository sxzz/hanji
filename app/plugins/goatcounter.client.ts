export default defineNuxtPlugin({
  name: 'hanji-goat-counter-pageviews',
  dependsOn: ['goat-counter'],
  setup(nuxtApp) {
    const goatCounter = useGoatCounter()
    if (!goatCounter) return

    const route = useRoute()
    let lastPath = ''
    const trackPage = () => {
      // Filter and search state lives in the query string. Count the actual
      // page once instead of creating an analytics path for every UI state.
      const path = route.path
      if (path === lastPath) return
      lastPath = path
      goatCounter.pageview({ path })
    }

    // mounted guarantees the landing page; page:finish covers Nuxt's soft
    // navigations. The path guard makes their initial overlap harmless.
    nuxtApp.hook('app:mounted', trackPage)
    nuxtApp.hook('page:finish', trackPage)
  },
})
