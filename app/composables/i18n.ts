import {
  DEFAULT_LOCALE,
  LOADERS,
  LOCALE_META,
  LOCALES,
  matchLocale,
  type Locale,
  type Messages,
} from '~/locales/index.ts'
import { zhCN } from '~/locales/zh-cn.ts'

/**
 * Messages that have arrived. The default is here from the start -- it is what
 * the prerendered HTML carries and what everything falls back to -- and the
 * others are filled in as their chunks load.
 */
const loaded = reactive<Partial<Record<Locale, Messages>>>({
  'zh-CN': zhCN,
})

async function load(locale: Locale): Promise<void> {
  if (loaded[locale]) return
  loaded[locale] = await LOADERS[locale]()
}

/** Follow one dotted key through a message tree. */
function lookup(messages: Messages | undefined, key: string): unknown {
  let value: unknown = messages
  for (const part of key.split('.')) {
    value = (value as Record<string, unknown>)?.[part]
    if (value === undefined) return undefined
  }
  return value
}

/**
 * Minimal message lookup. The call signature deliberately mirrors vue-i18n's
 * t(), so swapping in @nuxtjs/i18n later means replacing this file and nothing
 * in the components.
 */
export function useT() {
  const locale = useState<Locale>('locale', () => DEFAULT_LOCALE)

  function t(key: string, params?: Record<string, string | number>): string {
    // Falling back to the default covers both a key a translation has yet to
    // pick up and the moment before a chunk arrives
    const value = lookup(loaded[locale.value], key) ?? lookup(zhCN, key)
    if (typeof value !== 'string') return key
    if (!params) return value
    return value.replaceAll(/\{(\w+)\}/g, (whole, name: string) =>
      name in params ? String(params[name]) : whole,
    )
  }

  /**
   * Joining a list is a locale decision, not a punctuation one: zh-CN reads
   * 香港、台湾和日本 while en reads Hong Kong, Taiwan, and Japan. `narrow`
   * keeps a bare enumeration, the default reads as prose.
   */
  function list(items: string[], style: Intl.ListFormatStyle = 'long'): string {
    return new Intl.ListFormat(locale.value, {
      style,
      type: 'conjunction',
    }).format(items)
  }

  const meta = computed(() => LOCALE_META[locale.value])
  return { t, list, locale, meta }
}

/**
 * The reader's language.
 *
 * There is one prerendered build and it is in the default locale, so the
 * choice can only be made on the client -- reading it during hydration would
 * make the markup disagree with the server. A stored choice wins; failing
 * that the browser's own list decides, in its own order of preference.
 */
export function useLocaleChoice() {
  const { locale } = useT()
  const stored = useLocalStorage<Locale | ''>('hanji:locale', '')

  async function apply(next: Locale): Promise<void> {
    await load(next)
    locale.value = next
  }

  async function choose(next: Locale): Promise<void> {
    stored.value = next
    await apply(next)
  }

  onMounted(async () => {
    const wanted = (LOCALES as readonly string[]).includes(stored.value)
      ? (stored.value as Locale)
      : matchLocale(navigator.languages ?? [navigator.language])
    if (wanted && wanted !== locale.value) await apply(wanted)
  })

  return { locale, choose, locales: LOCALES }
}
