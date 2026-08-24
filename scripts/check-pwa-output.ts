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

assert.equal(manifest.name, '汉智')
assert.equal(manifest.short_name, '汉智')
assert.deepEqual(manifest.name_localized, {
  'zh-CN': '汉智',
  'zh-TW': '漢智',
  'zh-HK': '漢智',
  'ja-JP': '漢智',
  'ko-KR': '漢智',
})
assert.deepEqual(manifest.short_name_localized, manifest.name_localized)
assert.deepEqual(manifest.description_localized, {
  'zh-CN':
    '把同一个汉字并排、叠印，照见中国大陆、香港、台湾、日本与韩国之间细微而真实的字形差异。',
  'zh-TW':
    '把同一個漢字並排、疊印，照見中國大陸、香港、臺灣、日本與韓國之間細微而真實的字形差異。',
  'zh-HK':
    '把同一個漢字並排、疊印，照見中國大陸、香港、台灣、日本與韓國之間細微而真實的字形差異。',
  'ja-JP':
    '一つの漢字を並べて重ね、中国大陸、香港、台湾、日本、韓国のあいだにある、細やかで確かな字形の違いを映し出します。',
  'ko-KR':
    '한 글자를 나란히 놓고 겹쳐, 중국 대륙·홍콩·대만·일본·한국 사이의 작지만 분명한 자형 차이를 비춥니다.',
})
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
assert.deepEqual(manifest.screenshots, [
  {
    src: '/pwa/screenshot-wide.png',
    sizes: '1280x720',
    type: 'image/png',
    form_factor: 'wide',
    label: '汉智桌面端字形对照界面',
  },
  {
    src: '/pwa/screenshot-narrow.png',
    sizes: '390x844',
    type: 'image/png',
    form_factor: 'narrow',
    label: '汉智移动端字形对照界面',
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
  '/pwa/screenshot-wide.png',
  '/pwa/screenshot-narrow.png',
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
assert.match(shell, /name="application-name" content="汉智"/)
assert.match(shell, /name="apple-mobile-web-app-title" content="汉智"/)
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
