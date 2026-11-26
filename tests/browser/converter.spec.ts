import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function addImages(page: Page, panoramas = false) {
  const data = await page.evaluate(({ panoramas }) => {
    const images: string[] = []
    for (let i = 0; i < (panoramas ? 12 : 2); i++) {
      const canvas = document.createElement('canvas')
      canvas.width = panoramas ? 12000 : i === 0 ? 600 : 800
      canvas.height = panoramas ? 100 : i === 0 ? 800 : 600
      const ctx = canvas.getContext('2d')!
      if (panoramas) {
        const pixels = ctx.createImageData(canvas.width, canvas.height)
        let seed = i + 1
        for (let p = 0; p < pixels.data.length; p += 4) {
          seed = (seed * 1664525 + 1013904223) >>> 0
          pixels.data[p] = seed & 255
          pixels.data[p + 1] = seed >>> 8 & 255
          pixels.data[p + 2] = seed >>> 16 & 255
          pixels.data[p + 3] = 255
        }
        ctx.putImageData(pixels, 0, 0)
      } else {
        ctx.fillStyle = i === 0 ? '#2976bd' : '#9e461c'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = 'white'
        ctx.font = '48px sans-serif'
        ctx.fillText(`Page ${i + 1}`, 30, 100)
      }
      images.push(canvas.toDataURL(panoramas ? 'image/jpeg' : 'image/png', 0.95).split(',')[1])
    }
    return images
  }, { panoramas })
  await page.locator('input[type=file]').setInputFiles(data.map((bytes, i) => ({
    name: `page-${i + 1}.${panoramas ? 'jpg' : 'png'}`, mimeType: panoramas ? 'image/jpeg' : 'image/png', buffer: Buffer.from(bytes, 'base64'),
  })))
  await expect(page.getByRole('button', { name: 'Generate PDF', exact: true })).toBeEnabled()
}

async function downloadPdf(page: Page) {
  const event = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Generate PDF', exact: true }).click()
  const download = await event
  expect(download.suggestedFilename()).toMatch(/^imgtopdf-\d{8}-\d{6}\.pdf$/)
  return readFile((await download.path())!)
}

test.beforeEach(async ({ page }) => { await page.goto('./') })

test('has a clear heading and loads PDF code only when needed', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1, name: 'Turn images into a PDF' })).toBeVisible()
  await expect(page.getByText('Your files stay on this device.')).toBeVisible()
  expect(await page.evaluate(() => performance.getEntriesByType('resource').some(entry => entry.name.includes('/pdfService-')))).toBe(false)
})

test('unsupported and corrupt images show actionable errors before generation', async ({ page }) => {
  await page.locator('input[type=file]').setInputFiles({ name: 'bad.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') })
  await expect(page.getByRole('alert')).toContainText('Use a JPEG')
  await page.locator('input[type=file]').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') })
  await expect(page.getByRole('alert')).toContainText('could not be opened')
  await expect(page.getByRole('button', { name: 'Generate PDF', exact: true })).toHaveCount(0)
})

for (const option of ['default', 'high', '2mb', '5mb']) {
  test(`downloads correctly sized portrait and landscape pages: ${option}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await addImages(page)
    await page.getByLabel('PDF quality & size').selectOption(option)
    const bytes = await downloadPdf(page)
    const text = bytes.toString('latin1')
    expect(text.match(/\/Type \/Page\b/g)).toHaveLength(2)
    expect(text.match(/\/MediaBox \[[^\]]+\]/g)).toEqual(['/MediaBox [0 0 450. 600.]', '/MediaBox [0 0 600. 450.]'])
    if (option === '2mb' || option === '5mb') expect(bytes.length).toBeLessThanOrEqual(Number(option[0]) * 1024 * 1024)
    if (option === 'default') expect(bytes.length).toBeLessThan(100000)
    await expect(page.getByRole('status').filter({ hasText: 'Your PDF is ready' })).toBeVisible()
    expect(errors).toEqual([])
  })
}

test('reorders through buttons, previews full pages, and restores cleared images', async ({ page }) => {
  await addImages(page)
  await page.getByRole('button', { name: 'Move page 2 earlier', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Preview page 1: page-2.png', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  const bytes = await downloadPdf(page)
  expect(bytes.toString('latin1').match(/\/MediaBox \[[^\]]+\]/g)?.[0]).toBe('/MediaBox [0 0 600. 450.]')
  await page.getByRole('button', { name: 'Clear all', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Generate PDF', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo clear', exact: true }).click()
  await expect(page.getByRole('button', { name: /Preview page/ })).toHaveCount(2)
})

test('locks editing while generating and terminates a stalled worker on cancel', async ({ page }) => {
  await addImages(page)
  await page.getByLabel('PDF quality & size').selectOption('high')
  let started!: () => void
  const workerStarted = new Promise<void>(resolve => { started = resolve })
  await page.route('**/assets/compress.worker-*.js', async route => {
    await route.fulfill({ contentType: 'text/javascript', body: 'self.onmessage = () => {}' })
    started()
  })
  await page.getByRole('button', { name: 'Generate PDF', exact: true }).click()
  await workerStarted
  await expect(page.getByLabel('PDF quality & size')).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Add more images', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Remove page-1.png', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Clear all', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Cancel generation', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Generation cancelled.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Generate PDF', exact: true })).toBeEnabled()
})

test('worker errors are recoverable and visible', async ({ page }) => {
  await addImages(page)
  await page.getByLabel('PDF quality & size').selectOption('high')
  await page.route('**/assets/compress.worker-*.js', route => route.fulfill({ contentType: 'text/javascript', body: 'self.onmessage = () => self.postMessage({error:"Compression failed. Try Original quality."})' }))
  await page.getByRole('button', { name: 'Generate PDF', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Compression failed. Try Original quality.')
  await page.getByLabel('PDF quality & size').selectOption('default')
  expect((await downloadPdf(page)).length).toBeGreaterThan(0)
})

test('works without browser storage and fits the viewport with usable controls', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.getItem = () => { throw new DOMException('Storage blocked', 'SecurityError') }; Storage.prototype.setItem = () => { throw new DOMException('Storage blocked', 'SecurityError') } })
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Dark mode' }).click()
  await expect(page.getByRole('button', { name: 'Dark mode' })).toHaveAttribute('aria-pressed', 'true')
  await addImages(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const bounds = await page.getByRole('button', { name: 'Remove page-1.png', exact: true }).boundingBox()
  expect(bounds!.width).toBeGreaterThanOrEqual(44)
  expect(bounds!.height).toBeGreaterThanOrEqual(44)
  expect(await page.locator('.image-preview').first().evaluate(el => getComputedStyle(el).touchAction)).toBe('auto')
})

test('fits panoramic images within 2 MB using only one worker at a time', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'The same encoder is covered once with the full panorama batch.')
  await page.evaluate(() => {
    const NativeWorker = Worker
    Object.assign(window, { activeWorkers: 0, peakWorkers: 0 })
    window.Worker = class extends NativeWorker {
      constructor(...args: ConstructorParameters<typeof Worker>) {
        super(...args)
        const state = window as unknown as { activeWorkers: number; peakWorkers: number }
        state.activeWorkers++
        state.peakWorkers = Math.max(state.peakWorkers, state.activeWorkers)
      }
      terminate() { (window as unknown as { activeWorkers: number }).activeWorkers--; super.terminate() }
    }
  })
  await addImages(page, true)
  await page.getByLabel('PDF quality & size').selectOption('2mb')
  const bytes = await downloadPdf(page)
  expect(bytes.length).toBeLessThanOrEqual(2 * 1024 * 1024)
  expect(bytes.toString('latin1').match(/\/Type \/Page\b/g)).toHaveLength(12)
  const boxes = bytes.toString('latin1').match(/\/MediaBox \[[^\]]+\]/g)
  expect(boxes?.every(box => box === '/MediaBox [0 0 9000. 75.]')).toBe(true)
  expect(await page.evaluate(() => (window as unknown as { peakWorkers: number }).peakWorkers)).toBe(1)
})


test('dedicated drag handles reorder pages without blocking later interactions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Pointer dragging is checked on desktop; touch users also have move buttons.')
  await addImages(page)
  const handle = await page.getByRole('button', { name: 'Drag page 1 to reorder; move buttons are also available', exact: true }).boundingBox()
  const target = await page.getByRole('button', { name: 'Preview page 2: page-2.png', exact: true }).boundingBox()
  await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2)
  await page.mouse.down()
  // The library's pointer sensor has a 250ms activation delay.
  await page.waitForTimeout(300)
  await page.mouse.move(target!.x + target!.width / 2, target!.y + target!.height / 2, { steps: 20 })
  await page.mouse.up()
  await expect(page.getByRole('button', { name: 'Preview page 1: page-2.png', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Dark mode' }).click()
  await expect(page.getByRole('button', { name: 'Dark mode' })).toHaveAttribute('aria-pressed', 'true')
})
