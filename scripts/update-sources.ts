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
  type LockedAsset,
  type SourceLock,
} from './sources.ts'

const GITHUB_RAW =
  /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/
const UNICODE_LATEST = 'https://www.unicode.org/Public/UCD/latest/ucd/'
const UNICODE_README = 'https://www.unicode.org/Public/UCD/latest/ReadMe.txt'

interface GitHubRef {
  repo: string
  ref: string
}

const githubRef = (url: string): GitHubRef | undefined => {
  const match = GITHUB_RAW.exec(url)
  return match ? { repo: `${match[1]}/${match[2]}`, ref: match[3]! } : undefined
}

async function githubRevision(source: GitHubRef): Promise<string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'hanji-source-lock',
  }
  if (process.env.GITHUB_TOKEN)
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  const res = await fetch(
    `https://api.github.com/repos/${source.repo}/commits/${encodeURIComponent(source.ref)}`,
    { headers },
  )
  if (!res.ok)
    throw new Error(
      `cannot resolve ${source.repo}@${source.ref}: ${res.status}`,
    )
  const json = (await res.json()) as { sha?: string }
  if (!json.sha || !/^[a-f\d]{40}$/.test(json.sha))
    throw new Error(`invalid revision for ${source.repo}@${source.ref}`)
  return json.sha
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
  unicode: string,
): string {
  const match = GITHUB_RAW.exec(url)
  if (match) {
    const key = `${match[1]}/${match[2]}@${match[3]}`
    const revision = revisions.get(key)
    if (!revision) throw new Error(`unresolved GitHub source: ${key}`)
    return `https://raw.githubusercontent.com/${match[1]}/${match[2]}/${revision}/${match[4]}`
  }
  if (url.startsWith(UNICODE_LATEST))
    return url.replace(
      UNICODE_LATEST,
      `https://www.unicode.org/Public/${unicode}/ucd/`,
    )
  throw new Error(`source URL cannot be pinned: ${url}`)
}

function isLockedAsset(asset: LockedAsset | undefined): asset is LockedAsset {
  return Boolean(
    asset &&
    /^https:\/\//.test(asset.url) &&
    /^[a-f\d]{64}$/.test(asset.sha256) &&
    Number.isSafeInteger(asset.size) &&
    asset.size >= 0,
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
  const res = await fetch(url)
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
for (const url of Object.values(ASSET_URLS)) {
  const source = githubRef(url)
  if (source) refs.set(`${source.repo}@${source.ref}`, source)
}

process.stderr.write('Resolving source versions...\n')
const [resolvedRefs, unicode, previous] = await Promise.all([
  Promise.all(
    [...refs].map(
      async ([key, source]) => [key, await githubRevision(source)] as const,
    ),
  ),
  unicodeVersion(),
  existingLock(),
])
const revisions = new Map(resolvedRefs)
const revisionRecord = {
  ...Object.fromEntries(
    [...revisions].map(([key, revision]) => [`github:${key}`, revision]),
  ),
  'unicode:ucd': unicode,
}
const entries = Object.entries(ASSET_URLS).map(
  ([name, url]) => [name, pinnedUrl(url, revisions, unicode)] as const,
)
const current = Boolean(
  previous &&
  sameRecord(previous.revisions, revisionRecord) &&
  Object.keys(previous.assets).length === entries.length &&
  entries.every(
    ([name, url]) =>
      previous.assets[name]?.url === url &&
      isLockedAsset(previous.assets[name]),
  ),
)

if (current) {
  process.stderr.write(
    'Source versions unchanged; skipping downloads and data build.\n',
  )
} else {
  const assets = new Array<readonly [string, LockedAsset]>(entries.length)
  let next = 0

  process.stderr.write('Downloading changed pinned sources...\n')
  const worker = async () => {
    while (next < entries.length) {
      const index = next++
      const [name, url] = entries[index]!
      const locked = previous?.assets[name]
      assets[index] = [
        name,
        locked?.url === url && isLockedAsset(locked)
          ? locked
          : await download(name, url),
      ]
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))

  const lock: SourceLock = {
    version: 1,
    revisions: revisionRecord,
    assets: Object.fromEntries(assets),
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
