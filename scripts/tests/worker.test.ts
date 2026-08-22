import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

interface WranglerConfig {
  main?: string
  compatibility_flags?: string[]
  route?: unknown
  routes?: unknown
  workers_dev?: boolean
  preview_urls?: boolean
  assets: {
    binding?: string
    directory?: string
    html_handling?: string
    not_found_handling?: string
    run_worker_first?: boolean | string[]
  }
}

const wrangler: WranglerConfig = JSON.parse(
  readFileSync(new URL('../../wrangler.json', import.meta.url), 'utf8'),
)

describe('Workers Static Assets configuration', () => {
  it('deploys a purely static project without Worker invocations', () => {
    expect(wrangler).not.toHaveProperty('main')
    expect(wrangler).not.toHaveProperty('compatibility_flags')
    expect(wrangler.assets).not.toHaveProperty('binding')
    expect(wrangler.assets).not.toHaveProperty('run_worker_first')
  })

  it('serves generated HTML and the custom 404 page', () => {
    expect(wrangler.assets).toMatchObject({
      directory: '.output/public',
      html_handling: 'auto-trailing-slash',
      not_found_handling: '404-page',
    })
  })

  it('leaves the production domain to each deployment', () => {
    expect(wrangler).not.toHaveProperty('route')
    expect(wrangler).not.toHaveProperty('routes')
    expect(wrangler.workers_dev).toBe(false)
    expect(wrangler.preview_urls).toBe(true)
  })
})
