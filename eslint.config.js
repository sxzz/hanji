import { sxzz } from '@sxzz/eslint-config'

export default sxzz({
  vue: true,
  pnpm: true,
  baseline: {
    ignoreFeatures: ['top-level-await'],
  },
})
  .append({
    // Nuxt looks these up by file name, so a default export is the contract
    files: ['app/router.options.ts', 'nuxt.config.ts', 'app/locales/zh-cn.ts'],
    rules: { 'import/no-default-export': 'off' },
  })
  .append({
    ignores: ['public/data/**', 'public/fonts/**', 'data/raw/**'],
  })
