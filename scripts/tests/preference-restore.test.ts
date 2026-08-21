import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import {
  FLAGS_KEY,
  HIDDEN_KEY,
  LOCALE_KEY,
  OUTLINE_KEY,
  RESTORING_ATTRIBUTE,
  VISIBILITY_VERSION_KEY,
} from '../../app/utils/preference-restore.ts'
import config from '../../nuxt.config.ts'
import { PREFERENCE_RESTORE_SCRIPT } from '../preference-restore.ts'

interface RunOptions {
  storage?: Record<string, string>
  languages?: string[]
}

function runRestore({ storage = {}, languages = ['zh-CN'] }: RunOptions = {}) {
  const attributes = new Set<string>()
  const timers: (() => void)[] = []
  const documentElement = {
    lang: 'zh-CN',
    hasAttribute: (name: string) => attributes.has(name),
    setAttribute: (name: string) => attributes.add(name),
    removeAttribute: (name: string) => attributes.delete(name),
  }

  runInNewContext(PREFERENCE_RESTORE_SCRIPT, {
    document: { documentElement },
    localStorage: {
      getItem: (key: string) => storage[key] ?? null,
    },
    navigator: { languages, language: languages[0] ?? '' },
    setTimeout: (callback: () => void) => timers.push(callback),
  })

  return {
    htmlLang: () => documentElement.lang,
    isRestoring: () => attributes.has(RESTORING_ATTRIBUTE),
    runFallback: () => timers.forEach((callback) => callback()),
  }
}

describe('preference restoration screen', () => {
  it('leaves the static page visible when every preference is default', () => {
    expect(runRestore().isRestoring()).toBe(false)
    expect(
      runRestore({
        languages: ['ja-JP'],
        storage: { [LOCALE_KEY]: 'zh-CN' },
      }).isRestoring(),
    ).toBe(false)
  })

  it('understands legacy column state before deciding it differs', () => {
    expect(runRestore({ storage: { [HIDDEN_KEY]: '[]' } }).isRestoring()).toBe(
      false,
    )
    expect(
      runRestore({
        storage: {
          [HIDDEN_KEY]: JSON.stringify(['cn', 'hk', 'tw', 'jp', 'kr']),
          [VISIBILITY_VERSION_KEY]: 'true',
        },
      }).isRestoring(),
    ).toBe(false)
  })

  it.each([
    ['stored locale', { [LOCALE_KEY]: '"ja-JP"' }],
    ['flag labels', { [FLAGS_KEY]: 'true' }],
    ['outlines', { [OUTLINE_KEY]: '"true"' }],
    [
      'comparison scope',
      { [HIDDEN_KEY]: '[]', [VISIBILITY_VERSION_KEY]: 'true' },
    ],
  ])('hides a mismatching SSG frame for %s', (_, storage) => {
    expect(runRestore({ storage }).isRestoring()).toBe(true)
  })

  it('covers a browser-selected locale when no choice is stored', () => {
    const page = runRestore({ languages: ['en-US', 'zh-TW'] })
    expect(page.isRestoring()).toBe(true)
    expect(page.htmlLang()).toBe('zh-TW')
  })

  it('reveals the default page if the application never finishes', () => {
    const page = runRestore({ storage: { [LOCALE_KEY]: 'ja-JP' } })
    expect(page.isRestoring()).toBe(true)
    expect(page.htmlLang()).toBe('ja-JP')
    page.runFallback()
    expect(page.isRestoring()).toBe(false)
    expect(page.htmlLang()).toBe('zh-CN')
  })

  it('keeps no-JavaScript SSG visible by default', () => {
    expect(config.app.head.htmlAttrs).not.toHaveProperty(RESTORING_ATTRIBUTE)
    expect(config.app.head.script).toContainEqual({
      innerHTML: PREFERENCE_RESTORE_SCRIPT,
      tagPosition: 'head',
    })
  })
})
