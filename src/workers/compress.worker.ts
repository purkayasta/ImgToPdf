// Runs in a DedicatedWorkerGlobalScope at runtime.
// DOM lib (from tsconfig) provides OffscreenCanvas, ImageBitmap, MessageEvent, etc.
// We define a minimal interface for what we need instead of referencing the webworker
// lib's DedicatedWorkerGlobalScope (which isn't included in this project's tsconfig).
interface WorkerScope {
  onmessage: ((e: MessageEvent) => unknown) | null
  postMessage(data: unknown, transfer: Transferable[]): void
  postMessage(data: unknown): void
}
const workerSelf = self as unknown as WorkerScope

interface CompressInput {
  bitmap: ImageBitmap
  // Exactly one of these is set: a byte budget to fit, or a fixed quality to encode at.
  targetBytes?: number
  quality?: number
}

interface CompressOutput {
  buffer: ArrayBuffer
}

// Quality floor: below this, artifacts get ugly enough that downscaling the image
// produces a better-looking result than pushing quality lower. So we drop quality
// only down to MIN_QUALITY, then shrink dimensions to fit the rest of the budget.
const MIN_QUALITY = 0.5
// Don't shrink any side below this — past it the image is useless; return best effort.
const MIN_DIMENSION = 100
const MAX_ATTEMPTS = 6

workerSelf.onmessage = async (e: MessageEvent<CompressInput>): Promise<void> => {
  const { bitmap, targetBytes, quality } = e.data

  try {
    // Fixed-quality mode ("High"): one re-encode at full resolution, no byte target.
    if (quality !== undefined) {
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('failed to get 2D context from OffscreenCanvas')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(bitmap, 0, 0)
      bitmap.close()
      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality })
      const buffer = await blob.arrayBuffer()
      workerSelf.postMessage({ buffer } satisfies CompressOutput, [buffer])
      return
    }

    // Byte-budget mode below.
    if (targetBytes === undefined) throw new Error('no targetBytes or quality provided')
    let width = bitmap.width
    let height = bitmap.height
    let fallback: Blob | null = null // smallest blob produced so far, used if nothing fits

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const canvas = new OffscreenCanvas(Math.round(width), Math.round(height))
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('failed to get 2D context from OffscreenCanvas')

      // White background so PNG transparency composites correctly as JPEG
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

      // Cheapest acceptable quality at this resolution.
      const minBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: MIN_QUALITY })

      if (minBlob.size > targetBytes) {
        // Even min quality overshoots → resolution is the bottleneck. JPEG bytes scale
        // ~linearly with pixel area, so shrink by sqrt(target/size) (×0.95 safety) and retry.
        fallback = minBlob
        const scale = Math.sqrt(targetBytes / minBlob.size) * 0.95
        width *= scale
        height *= scale
        if (width < MIN_DIMENSION || height < MIN_DIMENSION) break
        continue
      }

      // Min quality fits → binary-search upward for the best quality within budget.
      let lo = MIN_QUALITY
      let hi = 0.95
      let best = minBlob
      for (let i = 0; i < 8; i++) {
        const mid = (lo + hi) / 2
        const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: mid })
        if (blob.size <= targetBytes) {
          best = blob
          lo = mid
        } else {
          hi = mid
        }
      }

      bitmap.close()
      const buffer = await best.arrayBuffer()
      workerSelf.postMessage({ buffer } satisfies CompressOutput, [buffer])
      return
    }

    // Hit the dimension floor without fitting — best effort with the smallest we made.
    bitmap.close()
    if (fallback) {
      const buffer = await fallback.arrayBuffer()
      workerSelf.postMessage({ buffer } satisfies CompressOutput, [buffer])
    } else {
      // Return empty buffer — pdfService's try/catch handles the downstream jsPDF error
      workerSelf.postMessage({ buffer: new ArrayBuffer(0) } satisfies CompressOutput)
    }
  } catch (err) {
    bitmap.close()
    console.error('[compress.worker]', err)
    workerSelf.postMessage({ buffer: new ArrayBuffer(0) } satisfies CompressOutput)
  }
}
