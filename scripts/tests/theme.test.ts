import { describe, expect, it } from 'vitest'
import { RESTORE_SCRIPT } from '../../app/utils/theme.ts'
import config from '../../nuxt.config.ts'

describe('theme restoration', () => {
  it('runs from the static head used by client-only fallback pages', () => {
    expect(config.app.head.script).toContainEqual({
      innerHTML: RESTORE_SCRIPT,
      tagPosition: 'head',
    })
  })
})
