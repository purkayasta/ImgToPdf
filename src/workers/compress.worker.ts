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
  targetBytes: number
}

interface CompressOutput {
  buffer: ArrayBuffer
}

workerSelf.onmessage = async (e: MessageEvent<CompressInput>): Promise<void> => {
  const { bitmap, targetBytes } = e.data

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    bitmap.close()
    console.error('[compress.worker] failed to get 2D context from OffscreenCanvas')
    // Return empty buffer — pdfService's try/catch will handle the downstream jsPDF error
    workerSelf.postMessage({ buffer: new ArrayBuffer(0) } satisfies CompressOutput)
    return
  }

  // White background so PNG transparency composites correctly as JPEG
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, bitmap.width, bitmap.height)
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close() // Release the transferable immediately after drawing

  let lo = 0.05
  let hi = 0.95
  let bestBlob: Blob | null = null

  // Binary search — 10 iterations gives quality precision within ~0.1%
  for (let i = 0; i < 10; i++) {
    const mid = (lo + hi) / 2
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: mid })
    if (blob.size <= targetBytes) {
      lo = mid
      bestBlob = blob
    } else {
      hi = mid
    }
  }

  // Fallback: even quality=0.05 exceeds budget — use it anyway (best we can do)
  const finalBlob =
    bestBlob ?? (await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.05 }))

  const buffer = await finalBlob.arrayBuffer()
  workerSelf.postMessage({ buffer } satisfies CompressOutput, [buffer])
}
