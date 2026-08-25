import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { RouterConfig } from '@nuxt/schema'

type ScrollBehavior = NonNullable<RouterConfig['scrollBehavior']>
type Route = Parameters<ScrollBehavior>[0]

let scrollBehavior: ScrollBehavior

function route(fullPath: string): Route {
  const url = new URL(fullPath, 'https://hanji.example')
  const value: Route = {
    fullPath: `${url.pathname}${url.search}${url.hash}`,
    hash: url.hash,
    matched: [],
    meta: {},
    name: undefined,
    params: {},
    path: url.pathname,
    query: {},
    redirectedFrom: undefined,
  }
  return value
}

beforeAll(async () => {
  vi.stubGlobal('ref', ref)
  const config = (await import('../app/router.options.ts')).default
  scrollBehavior = config.scrollBehavior!
})

afterAll(() => vi.unstubAllGlobals())

describe('router scroll behavior', () => {
  it('positions hash targets below the sticky header on same-page navigation', () => {
    vi.stubGlobal('document', {
      querySelector: () => ({ offsetHeight: 72 }),
    })

    expect(
      scrollBehavior(route('/about#brand-assets'), route('/about'), null),
    ).toEqual({ el: '#brand-assets', top: 88 })
  })
})
