import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import config from '../../nuxt.config.ts'
import type { CharsData } from '../../shared/types.ts'

const chars: CharsData = JSON.parse(
  readFileSync(
    new URL('../../public/data/chars.json', import.meta.url),
    'utf8',
  ),
)

describe('character page prerendering', () => {
  it('includes every canonical character route', () => {
    const routes = new Set(config.nitro.prerender.routes)
    const expected = chars.rows.map(
      (row) => `/char/${encodeURIComponent(row.key)}`,
    )

    expect(expected.filter((route) => !routes.has(route))).toEqual([])
    expect(
      [...routes].filter((route) => route.startsWith('/char/')),
    ).toHaveLength(chars.rows.length)
    expect(config.nitro.prerender.autoSubfolderIndex).toBe(false)
  })

  it('does not shadow generated pages with a Cloudflare fallback rule', () => {
    const redirects = new URL('../../public/_redirects', import.meta.url)
    const contents = existsSync(redirects)
      ? readFileSync(redirects, 'utf8')
      : ''

    // Cloudflare always applies matching _redirects rules, even when a static
    // asset exists. This rule would replace every generated detail page with
    // Nuxt's client-only fallback document.
    expect(contents).not.toMatch(/^\s*\/char\/\*\s+/m)
  })
})
