import { describe, expect, it } from 'vitest'
import { ASSET_URLS, sourceLock } from '../sources.ts'

const repo = 'Fitzgerald-Porthmouth-Koenigsegg/Plangothic_Project'
const asset = 'PlangothicP1-Regular.ttf'
const name = `font/${asset}`

describe('updatable font sources', () => {
  it('resolves Plangothic from the latest GitHub release', () => {
    expect(ASSET_URLS[name]).toBe(
      `https://github.com/${repo}/releases/latest/download/${asset}`,
    )

    const lock = sourceLock()
    const tag = lock.revisions[`github-release:${repo}`]
    expect(tag).toBeTruthy()
    expect(lock.assets[name]?.url).toBe(
      `https://github.com/${repo}/releases/download/${tag}/${asset}`,
    )
  })
})
