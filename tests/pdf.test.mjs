import test from 'node:test'
import assert from 'node:assert/strict'
import { getPageSize, getFilename, getTargetBytes } from '../src/utils/pdf.ts'
import ImageService from '../src/services/imageService.ts'

test('ordinary pages use 96 dpi and retain their aspect ratio', () => {
  assert.deepEqual(getPageSize(600, 800), [450, 600])
  assert.deepEqual(getPageSize(800, 600), [600, 450])
})

test('oversized pages fit the PDF limit without clipping or distortion', () => {
  for (const [width, height] of [[30000, 100], [100, 30000], [20000, 20000]]) {
    const [pageW, pageH] = getPageSize(width, height)
    assert.ok(pageW <= 14400 && pageH <= 14400)
    assert.ok(Math.abs(pageW / pageH - width / height) < 1e-9)
  }
})

test('invalid dimensions fail before creating a PDF', () => {
  for (const size of [0, -1, NaN, Infinity]) assert.throws(() => getPageSize(size, 10), /invalid dimensions/)
})

test('size targets and download names are deterministic', () => {
  assert.equal(getTargetBytes('2mb'), 2 * 1024 * 1024)
  assert.equal(getTargetBytes('5mb'), 5 * 1024 * 1024)
  assert.equal(getTargetBytes('default'), null)
  assert.equal(getTargetBytes('high'), null)
  assert.equal(getFilename(new Date(2026, 0, 2, 3, 4, 5)), 'imgtopdf-20260102-030405.pdf')
})

test('file validation rejects unsupported, empty, and oversized inputs', () => {
  assert.match(ImageService.validate(new File(['svg'], 'image.svg', { type: 'image/svg+xml' })), /Use a JPEG/)
  assert.match(ImageService.validate(new File([], 'empty.png', { type: 'image/png' })), /empty/)
  assert.match(ImageService.validate(new File([new Uint8Array(15 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' })), /exceeds 15 MB/)
  assert.equal(ImageService.validate(new File(['valid-size'], 'photo.jpg', { type: 'image/jpeg' })), null)
})
