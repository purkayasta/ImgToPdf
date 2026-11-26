import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { stripTypeScriptTypes } from 'node:module'

const source = stripTypeScriptTypes(readFileSync(new URL('../src/workers/compress.worker.ts', import.meta.url), 'utf8'))

async function compress({ width, height, targetBytes, quality, fail = false }) {
  let closed = false
  let response
  const scope = { postMessage: data => { response = data } }
  // Deterministic encoder isolates budget handling from browser-specific JPEG byte sizes.
  class Canvas {
    constructor(w, h) { this.width = w; this.height = h }
    getContext() { return fail ? null : { fillRect() {}, drawImage() {} } }
    async convertToBlob({ quality }) { return new Blob([new Uint8Array(Math.ceil(this.width * this.height * quality + 600))]) }
  }
  vm.runInNewContext(source, { self: scope, OffscreenCanvas: Canvas })
  await scope.onmessage({ data: { bitmap: { width, height, close() { closed = true } }, targetBytes, quality } })
  assert.equal(closed, true, 'bitmap is released on success and failure')
  return response
}

test('panoramas shrink below a 100px short side to satisfy their budget', async () => {
  const response = await compress({ width: 12000, height: 100, targetBytes: 40000 })
  assert.ok(response.buffer.byteLength > 0 && response.buffer.byteLength <= 40000)
})

test('portrait and square images stay inside their byte budgets', async () => {
  for (const [width, height] of [[100, 12000], [4000, 4000]]) {
    const response = await compress({ width, height, targetBytes: 100000 })
    assert.ok(response.buffer.byteLength <= 100000)
  }
})

test('impossible budgets report an error instead of returning oversized data', async () => {
  const response = await compress({ width: 100, height: 100, targetBytes: 100 })
  assert.match(response.error, /cannot fit/)
  assert.equal(response.buffer, undefined)
})

test('encoder failure is explicit and still releases the bitmap', async () => {
  const response = await compress({ width: 100, height: 100, quality: 0.85, fail: true })
  assert.match(response.error, /unavailable/)
  assert.equal(response.buffer, undefined)
})
