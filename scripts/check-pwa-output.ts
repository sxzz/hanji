import assert from 'node:assert/strict'
import { readdir, readFile, stat } from 'node:fs/promises'
import { relative, resolve, sep } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const OUTPUT = resolve(ROOT, '.output/public')

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = resolve(directory, entry.name)
        return entry.isDirectory() ? listFiles(path) : [path]
      }),
    )
  ).flat()
}

const webPath = (file: string): string =>
  `/${relative(OUTPUT, file).split(sep).join('/')}`

const manifest = JSON.parse(
  await readFile(resolve(OUTPUT, 'manifest.webmanifest'), 'utf8'),
) as Record<string, unknown>
const sw = await readFile(resolve(OUTPUT, 'sw.js'), 'utf8')
const shell = await readFile(resolve(OUTPUT, '200.html'), 'utf8')
const headers = await readFile(resolve(OUTPUT, '_headers'), 'utf8')

assert.equal(manifest.name, 'Hanji')
assert.equal(manifest.short_name, 'Hanji')
assert.equal(manifest.id, '/')
assert.equal(manifest.start_url, '/')
assert.equal(manifest.scope, '/')
assert.equal(manifest.display, 'standalone')
assert.equal(manifest.background_color, '#fbfaf7')
assert.equal(manifest.theme_color, '#fbfaf7')
assert.deepEqual(manifest.icons, [
  {
    src: '/pwa/icon-192.png',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: '/pwa/icon-512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: '/pwa/maskable-icon-512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'maskable',
  },
])

const precacheEntries = [...sw.matchAll(/\{url:("(?:\\.|[^"\\])*")/g)].map(
  (match) => JSON.parse(match[1]!) as string,
)
const precache = new Set(
  precacheEntries.map((url) => new URL(url, 'https://hanji.invalid').pathname),
)

assert.equal(
  precache.size,
  precacheEntries.length,
  'The generated precache manifest contains duplicate URLs.',
)

const nuxtAssets = await listFiles(resolve(OUTPUT, '_nuxt'))
for (const asset of nuxtAssets) {
  const path = webPath(asset)
  const { size } = await stat(asset)
  assert.ok(size <= 4 * 1024 * 1024, `${path} is larger than the 4 MiB limit.`)
  assert.ok(precache.has(path), `${path} is missing from the precache.`)
}

const notices = (await listFiles(resolve(OUTPUT, 'notices'))).map(webPath)
const requiredStableAssets = [
  '/200.html',
  '/data/chars.json',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/favicon-32x32.png',
  '/favicon.ico',
  '/logo.svg',
  '/logo-seal.svg',
  '/pwa/icon-192.png',
  '/pwa/icon-512.png',
  '/pwa/maskable-icon-512.png',
  '/pwa/apple-touch-icon-180.png',
  ...notices,
]
for (const asset of requiredStableAssets)
  assert.ok(precache.has(asset), `${asset} is missing from the precache.`)

const forbidden = [...precache].filter(
  (url) =>
    url.startsWith('/char/') ||
    url.startsWith('/og/') ||
    url === '/sitemap.xml' ||
    url === '/robots.txt',
)
assert.deepEqual(forbidden, [], 'Excluded static output entered the precache.')

assert.match(sw, /\.enable\(\)/, 'Navigation preload is not enabled.')
assert.match(sw, /cleanupOutdatedCaches\(\)/)
assert.match(sw, /self\.skipWaiting\(\)/)
assert.match(sw, /\.clientsClaim\(\)/)
assert.match(sw, /\.NetworkFirst\(/)
assert.match(sw, /networkTimeoutSeconds:3/)
assert.match(sw, /PrecacheFallbackPlugin\(\{fallbackURL:"\/200\.html"\}\)/)
assert.doesNotMatch(
  sw,
  /createHandlerBoundToURL\("\/"\)/,
  'Nuxt added a root-shell route ahead of the Network First handler.',
)

assert.match(shell, /rel="manifest" href="\/manifest\.webmanifest"/)
assert.match(
  shell,
  /rel="apple-touch-icon" sizes="180x180" href="\/pwa\/apple-touch-icon-180\.png"/,
)
assert.match(shell, /rel="icon" type="image\/svg\+xml" href="\/favicon\.svg"/)
assert.match(
  shell,
  /name="theme-color" media="\(prefers-color-scheme: dark\)" content="#121215"/,
)
assert.match(
  headers,
  /\/sw\.js\n {2}Cache-Control: public, max-age=0, must-revalidate/,
)
assert.match(
  headers,
  /\/manifest\.webmanifest\n {2}Content-Type: application\/manifest\+json; charset=utf-8\n {2}Cache-Control: public, max-age=0, must-revalidate/,
)

const precacheBytes = (
  await Promise.all(
    [...precache]
      .filter((url) => url !== '/data/chars.json')
      .map(async (url) => {
        const file = resolve(OUTPUT, `.${decodeURIComponent(url)}`)
        return (await stat(file)).size
      }),
  )
).reduce((total, size) => total + size, 0)
const charsBytes = (await stat(resolve(OUTPUT, 'data/chars.json'))).size

console.log(
  `Verified ${precache.size} PWA resources (${((precacheBytes + charsBytes) / 1024 / 1024).toFixed(2)} MiB).`,
)
