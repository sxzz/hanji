import { describe, expect, it } from 'vitest'
import {
  detectPwaInstallMode,
  type PwaInstallEnvironment,
} from '../../app/utils/pwa-install.ts'

const base: PwaInstallEnvironment = {
  promptAvailable: false,
  standalone: false,
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',
  platform: 'MacIntel',
  maxTouchPoints: 0,
}

const mode = (overrides: Partial<PwaInstallEnvironment>) =>
  detectPwaInstallMode({ ...base, ...overrides })

describe('PWA installation mode', () => {
  it('uses a browser-native prompt whenever one is available', () => {
    expect(mode({ promptAvailable: true })).toBe('native')
  })

  it.each([
    [
      'iPhone',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
      'iPhone',
      5,
    ],
    [
      'iPad',
      'Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
      'iPad',
      5,
    ],
    [
      'iPadOS desktop user agent',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
      'MacIntel',
      5,
    ],
  ])(
    'shows iOS instructions on %s',
    (_, userAgent, platform, maxTouchPoints) => {
      expect(mode({ userAgent, platform, maxTouchPoints })).toBe('ios')
    },
  )

  it('shows browser-menu instructions when Android has no native event', () => {
    expect(
      mode({
        userAgent:
          'Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36',
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
      }),
    ).toBe('android')
  })

  it('shows Add to Dock instructions for modern macOS Safari', () => {
    expect(
      mode({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.6 Safari/605.1.15',
      }),
    ).toBe('macos-safari')
  })

  it.each([
    ['ordinary Mac Chrome', base.userAgent],
    [
      'old macOS Safari',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/16.6 Safari/605.1.15',
    ],
  ])('does not invent an install path for %s', (_, userAgent) => {
    expect(mode({ userAgent })).toBeNull()
  })

  it('hides every installation path in standalone mode', () => {
    expect(mode({ promptAvailable: true, standalone: true })).toBeNull()
  })
})
