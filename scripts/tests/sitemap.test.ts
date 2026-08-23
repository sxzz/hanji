import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import config from '../../nuxt.config.ts'
import type { CharsData } from '../../shared/types.ts'

const chars: CharsData = JSON.parse(
  readFileSync(
    new URL('../../app/assets/data/chars.json', import.meta.url),
    'utf8',
  ),
)
const deployWorkflow = readFileSync(
  new URL('../../.github/workflows/deploy.yml', import.meta.url),
  'utf8',
)

describe('search engine discovery', () => {
  it('generates a static sitemap with every canonical page', () => {
    expect(config.modules).toEqual(
      expect.arrayContaining(['@nuxtjs/sitemap', '@nuxtjs/robots']),
    )
    expect(config.sitemap).toMatchObject({
      excludeAppSources: true,
      discoverImages: false,
      discoverVideos: false,
      xsl: false,
      zeroRuntime: true,
    })

    const urls = new Set(config.sitemap.urls)
    expect(urls.size).toBe(chars.rows.length + 2)
    expect(urls.size).toBeLessThanOrEqual(50_000)
    expect(urls.has('/')).toBe(true)
    expect(urls.has('/about')).toBe(true)

    for (const row of chars.rows) {
      expect(urls.has(`/char/${row.key}`)).toBe(true)
    }
  })

  it('advertises the sitemap through the robots module', () => {
    expect(config.robots.sitemap).toBe('/sitemap.xml')
  })

  it('injects the canonical origin and preview indexing policy at build time', () => {
    expect(deployWorkflow).toContain(
      'NUXT_SITE_URL: ${{ vars.NUXT_SITE_URL || github.event.repository.homepage }}',
    )
    expect(deployWorkflow).toContain(
      "NUXT_SITE_ENV: ${{ github.event_name == 'push' && 'production' || 'preview' }}",
    )
  })
})
