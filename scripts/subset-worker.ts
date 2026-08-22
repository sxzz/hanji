/**
 * One woff2 subset per message, so the pool in build-fonts.ts can spread them
 * across cores.
 *
 * The work is almost entirely woff2 encoding -- Brotli at quality 11, run
 * through wasm -- which takes a few hundred milliseconds per chunk against a
 * few milliseconds for the subsetting itself. subset-font serializes every
 * call behind a p-limit(1) over one shared wasm heap, so a single process can
 * only ever use one core no matter how the calls are scheduled. Separate
 * threads each get their own instance of it.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parentPort } from 'node:worker_threads'
import subsetFont from 'subset-font'
import { FONT_DIR, RAW_DIR } from './sources.ts'
import type { Buffer } from 'node:buffer'

export interface SubsetJob {
  index: number
  /** Source name under data/raw, already verified by the parent. */
  font: string
  text: string
  file: string
}

export interface SubsetDone {
  index: number
  bytes?: number
  error?: string
}

/**
 * The queue hands out jobs in order, so every worker is somewhere in the same
 * run of chunks and holding one source covers a long stretch of them.
 */
let loadedName: string | undefined
let loadedFont: Buffer | undefined

const port = parentPort!

port.on('message', async (job: SubsetJob) => {
  try {
    if (loadedName !== job.font) {
      loadedFont = await readFile(join(RAW_DIR, job.font))
      loadedName = job.font
    }
    const subset = await subsetFont(loadedFont!, job.text, {
      targetFormat: 'woff2',
      // The table renders isolated single characters, so no OpenType layout
      // is needed. Skipping the layout closure drops vertical and alternate
      // forms that can never be reached here, roughly halving the output.
      noLayoutClosure: true,
    })
    await writeFile(join(FONT_DIR, job.file), subset)
    port.postMessage({
      index: job.index,
      bytes: subset.length,
    } satisfies SubsetDone)
  } catch (error) {
    port.postMessage({
      index: job.index,
      error: error instanceof Error ? error.stack : String(error),
    } satisfies SubsetDone)
  }
})
