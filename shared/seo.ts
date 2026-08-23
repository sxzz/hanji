import { OG_IMAGE_HEIGHT, OG_IMAGE_TYPE, OG_IMAGE_WIDTH } from './brand.ts'

export type SchemaOrgPageType = 'AboutPage' | 'CollectionPage' | 'ItemPage'

export interface SchemaOrgPageOptions {
  alternateSiteName: string
  description: string
  imageAlt: string
  imageUrl: string
  inLanguage: string
  name: string
  pageType: SchemaOrgPageType
  pageUrl: string
  siteDescription: string
  siteName: string
  siteUrl: string
}

/**
 * One compact graph describes the site, the current page, and its social
 * image. Keeping this framework-independent lets the prerendered output and
 * its tests share the exact same Schema.org structure.
 */
export function schemaOrgPage({
  alternateSiteName,
  description,
  imageAlt,
  imageUrl,
  inLanguage,
  name,
  pageType,
  pageUrl,
  siteDescription,
  siteName,
  siteUrl,
}: SchemaOrgPageOptions) {
  const rootUrl = new URL('/', siteUrl).href
  const websiteId = `${rootUrl}#website`
  const pageId = `${pageUrl}#webpage`
  const imageId = `${imageUrl}#primaryimage`

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': websiteId,
        url: rootUrl,
        name: siteName,
        alternateName: alternateSiteName,
        description: siteDescription,
        inLanguage,
      },
      {
        '@type': pageType,
        '@id': pageId,
        url: pageUrl,
        name,
        description,
        inLanguage,
        isPartOf: { '@id': websiteId },
        primaryImageOfPage: { '@id': imageId },
        image: { '@id': imageId },
      },
      {
        '@type': 'ImageObject',
        '@id': imageId,
        url: imageUrl,
        contentUrl: imageUrl,
        caption: imageAlt,
        inLanguage,
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        encodingFormat: OG_IMAGE_TYPE,
        representativeOfPage: true,
      },
    ],
  }
}
