import { describe, expect, it } from 'vitest'
import { schemaOrgPage } from '../shared/seo.ts'

describe('Schema.org page metadata', () => {
  it('links the site, current page, and primary social image', () => {
    const schema = schemaOrgPage({
      alternateSiteName: 'Hanji',
      description: 'Character comparison',
      imageAlt: 'Regional forms of 骨 overprinted',
      imageUrl: 'https://hanji.example/og/char/%E9%AA%A8.png',
      inLanguage: 'zh-CN',
      name: '骨 · 汉智',
      pageType: 'ItemPage',
      pageUrl: 'https://hanji.example/char/%E9%AA%A8',
      siteDescription: 'Compare regional Han character forms.',
      siteName: '汉智',
      siteUrl: 'https://hanji.example',
    })

    expect(schema).toMatchObject({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': 'https://hanji.example/#website',
          url: 'https://hanji.example/',
          name: '汉智',
          alternateName: 'Hanji',
        },
        {
          '@type': 'ItemPage',
          '@id': 'https://hanji.example/char/%E9%AA%A8#webpage',
          url: 'https://hanji.example/char/%E9%AA%A8',
          isPartOf: { '@id': 'https://hanji.example/#website' },
          primaryImageOfPage: {
            '@id': 'https://hanji.example/og/char/%E9%AA%A8.png#primaryimage',
          },
        },
        {
          '@type': 'ImageObject',
          '@id': 'https://hanji.example/og/char/%E9%AA%A8.png#primaryimage',
          contentUrl: 'https://hanji.example/og/char/%E9%AA%A8.png',
          width: 1200,
          height: 630,
          encodingFormat: 'image/png',
          representativeOfPage: true,
        },
      ],
    })
  })

  it.each(['AboutPage', 'CollectionPage', 'ItemPage'] as const)(
    'keeps %s as the page-specific type',
    (pageType) => {
      const schema = schemaOrgPage({
        alternateSiteName: 'Hanji',
        description: 'Description',
        imageAlt: 'Image',
        imageUrl: 'https://hanji.example/og/home.png',
        inLanguage: 'zh-CN',
        name: 'Page',
        pageType,
        pageUrl: 'https://hanji.example/',
        siteDescription: 'Site description',
        siteName: '汉智',
        siteUrl: 'https://hanji.example/',
      })

      expect(schema['@graph'][1]['@type']).toBe(pageType)
    },
  )

  it('uses en-US throughout English structured data', () => {
    const schema = schemaOrgPage({
      alternateSiteName: 'Hanji',
      description: 'Compare regional glyph forms.',
      imageAlt: 'Regional glyph forms',
      imageUrl: 'https://hanji.example/og/home.png',
      inLanguage: 'en-US',
      name: 'Hanji · One character across five regions',
      pageType: 'CollectionPage',
      pageUrl: 'https://hanji.example/',
      siteDescription: 'Compare regional glyph forms.',
      siteName: 'Hanji',
      siteUrl: 'https://hanji.example/',
    })

    expect(schema['@graph']).toMatchObject([
      { name: 'Hanji', inLanguage: 'en-US' },
      {
        name: 'Hanji · One character across five regions',
        inLanguage: 'en-US',
      },
      { caption: 'Regional glyph forms', inLanguage: 'en-US' },
    ])
    expect(schema['@graph'][0]).not.toHaveProperty('alternateName')
  })
})
