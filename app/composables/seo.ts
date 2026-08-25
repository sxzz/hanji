import {
  LOGO_PATH,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_TYPE,
  OG_IMAGE_WIDTH,
  TWITTER_SITE,
} from '~~/shared/brand.ts'
import { schemaOrgPage, type SchemaOrgPageType } from '~~/shared/seo.ts'
import type { MaybeRefOrGetter } from 'vue'

interface PageSeoOptions {
  description: MaybeRefOrGetter<string>
  imageAlt: MaybeRefOrGetter<string>
  imagePath: MaybeRefOrGetter<string>
  ogType?: 'article' | 'website'
  pageType: SchemaOrgPageType
  path: MaybeRefOrGetter<string>
  socialTitle: MaybeRefOrGetter<string>
  title?: MaybeRefOrGetter<string>
}

/** Full metadata shared by every indexable page. */
export function usePageSeo(options: PageSeoOptions) {
  const { t, meta } = useT()
  const siteUrl = useRuntimeConfig().public.siteUrl
  const pageUrl = computed(() => new URL(toValue(options.path), siteUrl).href)
  const imageUrl = computed(
    () => new URL(toValue(options.imagePath), siteUrl).href,
  )
  const logoUrl = new URL(LOGO_PATH, siteUrl).href
  const description = computed(() => toValue(options.description))
  const imageAlt = computed(() => toValue(options.imageAlt))
  const socialTitle = computed(() => toValue(options.socialTitle))
  const title = options.title

  useSeoMeta({
    ...(title ? { title: computed(() => toValue(title)) } : {}),
    applicationName: () => t('meta.name'),
    description,
    ogTitle: socialTitle,
    ogDescription: description,
    ogImage: imageUrl,
    ogImageSecureUrl: imageUrl,
    ogImageType: OG_IMAGE_TYPE,
    ogImageAlt: imageAlt,
    ogImageWidth: OG_IMAGE_WIDTH,
    ogImageHeight: OG_IMAGE_HEIGHT,
    ogLocale: () => meta.value.htmlLang.replace('-', '_'),
    ogType: options.ogType ?? 'website',
    ogUrl: pageUrl,
    ogSiteName: () => t('meta.title'),
    twitterCard: 'summary_large_image',
    twitterSite: TWITTER_SITE,
    twitterTitle: socialTitle,
    twitterDescription: description,
    twitterImage: imageUrl,
    twitterImageAlt: imageAlt,
  })

  const schema = computed(() =>
    schemaOrgPage({
      alternateSiteName: t('meta.name'),
      description: description.value,
      imageAlt: imageAlt.value,
      imageUrl: imageUrl.value,
      inLanguage: meta.value.htmlLang,
      name: socialTitle.value,
      pageType: options.pageType,
      pageUrl: pageUrl.value,
      siteDescription: t('meta.description'),
      siteName: t('meta.title'),
      siteUrl,
    }),
  )

  useHead(() => ({
    link: [{ rel: 'canonical', href: pageUrl.value }],
    meta: [{ property: 'og:logo', content: logoUrl }],
    script: [
      {
        key: 'schema-org',
        type: 'application/ld+json',
        // A literal '<' can terminate a script element even inside JSON.
        innerHTML: JSON.stringify(schema.value).replaceAll(
          '<',
          String.raw`\u003C`,
        ),
      },
    ],
  }))
}
