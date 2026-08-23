import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import process from 'node:process'
import {
  ASSET_URLS,
  RAW_DIR,
  SOURCE_LOCK_PATH,
  sourceFetchOptions,
  type LockedAsset,
  type SourceLock,
} from './sources.ts'

const GITHUB_RAW =
  /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/
const GITHUB_ARCHIVE =
  /^https:\/\/codeload\.github\.com\/([^/]+)\/([^/]+)\/zip\/refs\/heads\/(.+)$/
const GITHUB_LATEST_RELEASE =
  /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/releases\/latest\/download\/(.+)$/
const GITHUB_VERSIONED_RELEASE =
  /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/releases\/download\/([^/]+)\/(.+)$/
const UNICODE_LATEST = 'https://www.unicode.org/Public/UCD/latest/ucd/'
const UNICODE_README = 'https://www.unicode.org/Public/UCD/latest/ReadMe.txt'

interface GitHubRef {
  repo: string
  ref: string
}

interface GitHubReleaseAssetRef {
  repo: string
  asset: string
}

interface GitHubRelease {
  tag: string
  assets: Map<string, string>
}

interface ResolvedGitHubReleaseAsset extends GitHubReleaseAssetRef {
  tag: string
  url: string
}

const githubRef = (url: string): GitHubRef | undefined => {
  const raw = GITHUB_RAW.exec(url)
  if (raw) return { repo: `${raw[1]}/${raw[2]}`, ref: raw[3]! }
  const archive = GITHUB_ARCHIVE.exec(url)
  return archive
    ? { repo: `${archive[1]}/${archive[2]}`, ref: archive[3]! }
    : undefined
}

const githubReleaseAsset = (url: string): GitHubReleaseAssetRef | undefined => {
  const match = GITHUB_LATEST_RELEASE.exec(url)
  return match
    ? { repo: `${match[1]}/${match[2]}`, asset: match[3]! }
    : undefined
}

const githubHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'hanji-source-lock',
  }
  if (process.env.GITHUB_TOKEN)
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  return headers
}

async function githubRevision(source: GitHubRef): Promise<string> {
  const res = await fetch(
    `https://api.github.com/repos/${source.repo}/git/ref/heads/${encodeURIComponent(source.ref)}`,
    { headers: githubHeaders() },
  )
  if (!res.ok)
    throw new Error(
      `cannot resolve ${source.repo}@${source.ref}: ${res.status}`,
    )
  const json = (await res.json()) as {
    object?: { sha?: unknown; type?: unknown }
  }
  if (
    json.object?.type !== 'commit' ||
    typeof json.object.sha !== 'string' ||
    !/^[a-f\d]{40}$/.test(json.object.sha)
  )
    throw new Error(`invalid revision for ${source.repo}@${source.ref}`)
  return json.object.sha
}

async function githubLatestReleaseAsset(
  source: GitHubReleaseAssetRef,
): Promise<ResolvedGitHubReleaseAsset> {
  const latest = `https://github.com/${source.repo}/releases/latest/download/${source.asset}`
  // GitHub resolves this stable URL to the matching versioned release asset.
  // Stop at the first redirect so the expiring storage URL is never locked.
  const res = await fetch(latest, { method: 'HEAD', redirect: 'manual' })
  const location = res.headers.get('location')
  if (res.status < 300 || res.status >= 400 || !location)
    throw new Error(
      `cannot resolve latest release asset ${source.repo}/${source.asset}: ${res.status}`,
    )

  const url = new URL(location, latest).href
  const match = GITHUB_VERSIONED_RELEASE.exec(url)
  if (
    !match ||
    `${match[1]}/${match[2]}` !== source.repo ||
    decodeURIComponent(match[4]!) !== source.asset
  )
    throw new Error(
      `invalid latest release redirect for ${source.repo}/${source.asset}: ${url}`,
    )
  return {
    ...source,
    tag: decodeURIComponent(match[3]!),
    url,
  }
}

async function unicodeVersion(): Promise<string> {
  const res = await fetch(UNICODE_README)
  if (!res.ok) throw new Error(`cannot resolve latest Unicode: ${res.status}`)
  const match = /for Version (\d+\.\d+\.\d+) of the Unicode Standard/.exec(
    await res.text(),
  )
  if (!match) throw new Error('cannot parse latest Unicode version')
  return match[1]!
}

function pinnedUrl(
  url: string,
  revisions: ReadonlyMap<string, string>,
  releases: ReadonlyMap<string, GitHubRelease>,
  unicode: string,
): string {
  const match = GITHUB_RAW.exec(url)
  if (match) {
    const key = `${match[1]}/${match[2]}@${match[3]}`
    const revision = revisions.get(key)
    if (!revision) throw new Error(`unresolved GitHub source: ${key}`)
    return `https://raw.githubusercontent.com/${match[1]}/${match[2]}/${revision}/${match[4]}`
  }
  const archive = GITHUB_ARCHIVE.exec(url)
  if (archive) {
    const key = `${archive[1]}/${archive[2]}@${archive[3]}`
    const revision = revisions.get(key)
    if (!revision) throw new Error(`unresolved GitHub source: ${key}`)
    return `https://codeload.github.com/${archive[1]}/${archive[2]}/zip/${revision}`
  }
  const releaseAsset = githubReleaseAsset(url)
  if (releaseAsset) {
    const resolved = releases
      .get(releaseAsset.repo)
      ?.assets.get(releaseAsset.asset)
    if (!resolved)
      throw new Error(
        `latest release of ${releaseAsset.repo} has no ${releaseAsset.asset}`,
      )
    return resolved
  }
  if (url.startsWith(UNICODE_LATEST))
    return url.replace(
      UNICODE_LATEST,
      `https://www.unicode.org/Public/${unicode}/ucd/`,
    )
  if (/^https:\/\//.test(url)) return url
  throw new Error(`invalid source URL: ${url}`)
}

function isLockedAsset(asset: LockedAsset | undefined): asset is LockedAsset {
  if (!asset) return false
  const { size } = asset
  return (
    /^https:\/\//.test(asset.url) &&
    /^[a-f\d]{64}$/.test(asset.sha256) &&
    Number.isSafeInteger(size) &&
    size >= 0
  )
}

async function existingLock(): Promise<SourceLock | undefined> {
  if (!existsSync(SOURCE_LOCK_PATH)) return undefined
  const lock = JSON.parse(
    await readFile(SOURCE_LOCK_PATH, 'utf8'),
  ) as SourceLock
  if (lock.version !== 1 || !lock.assets || !lock.revisions)
    throw new Error(`invalid source lock: ${SOURCE_LOCK_PATH}`)
  return lock
}

function sameRecord(
  left: Readonly<Record<string, string>>,
  right: Readonly<Record<string, string>>,
): boolean {
  const keys = Object.keys(left)
  return (
    keys.length === Object.keys(right).length &&
    keys.every((key) => left[key] === right[key])
  )
}

async function download(name: string, url: string): Promise<LockedAsset> {
  process.stderr.write(`  ↓ ${name}\n`)
  const res = await fetch(url, sourceFetchOptions(url))
  if (!res.ok) throw new Error(`download failed: ${res.status} ${url}`)
  const data = Buffer.from(await res.arrayBuffer())
  await mkdir(dirname(join(RAW_DIR, name)), { recursive: true })
  await writeFile(join(RAW_DIR, name), data)
  return {
    url,
    sha256: createHash('sha256').update(data).digest('hex'),
    size: data.byteLength,
  }
}

const refs = new Map<string, GitHubRef>()
const releaseAssets = new Map<string, GitHubReleaseAssetRef>()
for (const url of Object.values(ASSET_URLS)) {
  const source = githubRef(url)
  if (source) refs.set(`${source.repo}@${source.ref}`, source)
  const release = githubReleaseAsset(url)
  if (release)
    releaseAssets.set(`${release.repo}\u{0}${release.asset}`, release)
}

process.stderr.write('Resolving source versions...\n')
const [resolvedRefs, resolvedReleases, unicode, previous] = await Promise.all([
  Promise.all(
    [...refs].map(
      async ([key, source]) => [key, await githubRevision(source)] as const,
    ),
  ),
  Promise.all([...releaseAssets.values()].map(githubLatestReleaseAsset)),
  unicodeVersion(),
  existingLock(),
])
const revisions = new Map(resolvedRefs)
const releases = new Map<string, GitHubRelease>()
for (const resolved of resolvedReleases) {
  const release = releases.get(resolved.repo)
  if (release && release.tag !== resolved.tag)
    throw new Error(
      `latest release assets for ${resolved.repo} resolved to different tags`,
    )
  const current = release ?? { tag: resolved.tag, assets: new Map() }
  current.assets.set(resolved.asset, resolved.url)
  releases.set(resolved.repo, current)
}
const revisionRecord = {
  ...Object.fromEntries(
    [...revisions].map(([key, revision]) => [`github:${key}`, revision]),
  ),
  ...Object.fromEntries(
    [...releases].map(([repo, release]) => [
      `github-release:${repo}`,
      release.tag,
    ]),
  ),
  'unicode:ucd': unicode,
}
const entries = Object.entries(ASSET_URLS).map(([name, sourceUrl]) => ({
  name,
  url: pinnedUrl(sourceUrl, revisions, releases, unicode),
  // Direct institutional downloads and release assets can change without a
  // new revision in their URL. Recheck their bytes on an explicit source
  // update; ordinary builds remain locked to the recorded SHA-256 and fail
  // rather than accepting a silent change.
  refresh: !githubRef(sourceUrl) && !sourceUrl.startsWith(UNICODE_LATEST),
}))
const assets: (readonly [string, LockedAsset])[] = []
let next = 0

process.stderr.write('Checking changed pinned sources...\n')
const worker = async () => {
  while (next < entries.length) {
    const index = next++
    const { name, url, refresh } = entries[index]!
    const locked = previous?.assets[name]
    assets[index] = [
      name,
      !refresh && locked?.url === url && isLockedAsset(locked)
        ? locked
        : await download(name, url),
    ]
  }
}
await Promise.all(Array.from({ length: 4 }, worker))

const assetRecord = Object.fromEntries(assets)
const current = Boolean(
  previous &&
  sameRecord(previous.revisions, revisionRecord) &&
  Object.keys(previous.assets).length === entries.length &&
  entries.every(({ name }) => {
    const before = previous.assets[name]
    const after = assetRecord[name]
    return (
      before?.url === after?.url &&
      before.sha256 === after.sha256 &&
      before.size === after.size
    )
  }),
)

if (current) {
  process.stderr.write(
    'Source versions and direct assets unchanged; skipping data build.\n',
  )
} else {
  const lock: SourceLock = {
    version: 1,
    revisions: revisionRecord,
    assets: assetRecord,
  }
  await mkdir(dirname(SOURCE_LOCK_PATH), { recursive: true })
  await writeFile(SOURCE_LOCK_PATH, `${JSON.stringify(lock, null, 2)}\n`)

  const total = assets.reduce((sum, [, asset]) => sum + asset.size, 0)
  process.stderr.write(
    `Locked ${assets.length} assets (${(total / 1024 / 1024).toFixed(1)} MB).\n`,
  )
  process.stderr.write('Building data from locked sources...\n')
  await import('./build-data.ts')
  await import('./build-fonts.ts')
}
