import {
  defineConfig,
  presetIcons,
  presetWind3,
  transformerDirectives,
} from 'unocss'

export default defineConfig({
  theme: {
    /**
     * `xs` is the width at which the nav still has room for the wordmark
     * beside the title -- a large phone rather than a small one. Everything
     * above it is the preset's own scale.
     */
    breakpoints: {
      xs: '380px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
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

  /** Every face this app uses is cut and served by us; see vars.css. */
  rules: [['font-mono', { 'font-family': 'var(--font-mono)' }]],

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

    /*
     * These name a recurring control rather than a one-off run of utilities.
     * None of them carries `focus-ring`: that class is written by hand in
     * global.css, and folding it into a shortcut would leave the element with
     * only the shortcut's name for the hand-written rule to match. Every
     * focusable element keeps `focus-ring` beside the shortcut.
     */

    // A square icon-only control, the size of a comfortable touch target
    'icon-btn':
      'size-8 flex-center rounded-md text-mute transition-colors duration-150 hover:text-ink',
    // A quiet outlined button
    'btn-ghost':
      'border border-rule rounded-md text-soft transition-colors duration-150 hover:border-ink/25 hover:text-ink',
    // Paging, where a disabled button must not answer to hover
    'btn-pager':
      'border border-rule rounded-md px-3 py-1.5 text-soft transition-colors duration-150 disabled:opacity-35 enabled:hover:border-ink/25 enabled:hover:text-ink',
    /**
     * A filter chip. Selection is a filled slab rather than a border, so which
     * chips are on reads at a glance across the whole bar. Callers add the gap
     * and type size their own contents need.
     */
    chip: 'h-7 flex items-center border rounded-md px-2 transition duration-150',
    'chip-on': 'border-$c-ink bg-$c-ink text-$c-paper',
    'chip-off': 'border-rule bg-paper text-soft hover:border-ink/30',
    // An underline in the register of the page's hairlines. Named rule-first:
    // presetWind3 reads a leading `link-` as the :link variant.
    'rule-link':
      'underline decoration-rule underline-offset-4 hover:decoration-ink',
  },

  /**
   * `focus-ring` is a hand-written class (see global.css), but the preset also
   * reads it as `focus:ring` and was quietly painting a second, blue ring on
   * every mouse click. Nothing wants that utility here.
   */
  blocklist: ['focus-ring'],

  presets: [
    presetWind3(),
    presetIcons({
      scale: 1.1,
      extraProperties: { color: 'inherit', 'min-width': '1.1em' },
    }),
    // Interface body type. The variant follows the locale -- see
    // app/locales/index.ts. The four Han columns use self-hosted subsets
    // instead and never come through here.
  ],

  transformers: [transformerDirectives()],
})
