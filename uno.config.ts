import {
  defineConfig,
  presetIcons,
  presetWebFonts,
  presetWind3,
  transformerDirectives,
} from 'unocss'

export default defineConfig({
  theme: {
    colors: {
      ink: 'var(--c-ink)',
      'ink-soft': 'var(--c-ink-soft)',
      'ink-mute': 'var(--c-ink-mute)',
      paper: 'var(--c-paper)',
      'paper-sunk': 'var(--c-paper-sunk)',
      rule: 'var(--c-rule)',
      // Proof-sheet accents. These encode grouping, never region identity.
      g1: 'var(--c-g1)',
      g2: 'var(--c-g2)',
      g3: 'var(--c-g3)',
      g4: 'var(--c-g4)',
      g5: 'var(--c-g5)',
    },
  },

  shortcuts: {
    'border-rule': 'border-$c-rule',
    'bg-paper': 'bg-$c-paper',
    'bg-sunk': 'bg-$c-paper-sunk',
    'text-ink': 'text-$c-ink',
    'text-soft': 'text-$c-ink-soft',
    'text-mute': 'text-$c-ink-mute',
    'flex-center': 'flex items-center justify-center',
    // Small label, in the register of a spec document
    eyebrow: 'font-mono text-[0.6875rem] tracking-[0.04em] text-mute',
  },

  presets: [
    presetWind3(),
    presetIcons({
      scale: 1.1,
      extraProperties: { color: 'inherit', 'min-width': '1.1em' },
    }),
    // Interface body type. The variant follows the locale -- see
    // app/locales/index.ts. The four Han columns use self-hosted subsets
    // instead and never come through here.
    presetWebFonts({
      provider: 'google',
      fonts: {
        sans: ['Noto Sans:400,500,700', 'Noto Sans SC:400,500,700'],
        serif: ['Noto Serif:400,500,700', 'Noto Serif SC:400,500,700'],
        mono: ['IBM Plex Mono:400,500,600'],
      },
    }),
  ],

  transformers: [transformerDirectives()],
})
