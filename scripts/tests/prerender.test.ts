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

  it('opts out of a network favicon request', () => {
    expect(config.app.head.link).toContainEqual({ rel: 'icon', href: 'data:,' })
  })
})
