import { jsPDF } from 'jspdf'
import type { ImageFile } from '../types/image'
import CompressWorker from '../workers/compress.worker?worker'

export type PdfSizeOption = 'default' | '5mb' | '20mb'

// Approximate overhead jsPDF adds beyond raw image bytes (metadata, xref table, etc.)
const PDF_OVERHEAD_BYTES = 75 * 1024 // 75 KB safety margin

const SIZE_TARGET_BYTES: Record<PdfSizeOption, number | null> = {
  default: null,
  '5mb': 5 * 1024 * 1024,
  '20mb': 20 * 1024 * 1024,
}

const FORMAT_MAP: Record<string, string> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
  'image/gif': 'GIF',
  'image/bmp': 'BMP',
}

function getFilename(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const mins = String(now.getMinutes()).padStart(2, '0')
  const secs = String(now.getSeconds()).padStart(2, '0')
  return `imgtopdf-${year}${month}${day}-${hours}${mins}${secs}.pdf`
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Compress an image to JPEG off the main thread using a Web Worker.
 * Binary-searches JPEG quality so the output stays within `targetBytes`.
 * Returns the compressed data as a Uint8Array ready for jsPDF.addImage.
 */
async function compressInWorker(imgEl: HTMLImageElement, targetBytes: number): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(imgEl)

  return new Promise<Uint8Array>((resolve, reject) => {
    const worker = new CompressWorker()

    worker.onmessage = (e: MessageEvent<{ buffer: ArrayBuffer }>) => {
      worker.terminate()
      resolve(new Uint8Array(e.data.buffer))
    }

    worker.onerror = (err) => {
      worker.terminate()
      reject(err)
    }

    // Transfer the bitmap to avoid copying pixel data across threads
    worker.postMessage({ bitmap, targetBytes }, [bitmap])
  })
}


async function generatePdf(
  images: ImageFile[],
  sizeOption: PdfSizeOption,
  onProgress?: (pct: number) => void,
): Promise<void> {
  // Guard: service must not rely on the UI's disabled state as the only protection
  if (images.length === 0) throw new Error('[pdfService] no images provided')

  const filename = getFilename()
  console.log(
    `[pdfService] generation started — ${images.length} image(s), size: ${sizeOption}, file: ${filename}`,
  )

  const targetBytes = SIZE_TARGET_BYTES[sizeOption]
  const perImageBudget =
    targetBytes !== null
      ? Math.floor((targetBytes - PDF_OVERHEAD_BYTES) / images.length)
      : null

  if (perImageBudget !== null) {
    console.log(`[pdfService] per-image budget: ${(perImageBudget / 1024).toFixed(1)} KB`)
  }

  // Each image contributes equally across two phases (load/compress + add to PDF)
  const total = images.length * 2
  let done = 0
  const tick = () => onProgress?.(Math.round((++done / total) * 100))

  try {
    // Load and compress all images in parallel — workers run concurrently
    const processed = await Promise.all(images.map(async (image) => {
      const imgEl = await loadImage(image.previewUrl)
      const compressed = perImageBudget !== null
        ? await compressInWorker(imgEl, perImageBudget)
        : null
      tick()
      return { imgEl, compressed, fileType: image.file.type }
    }))

    const { imgEl: firstEl } = processed[0]
    const doc = new jsPDF({
      unit: 'px',
      format: [firstEl.naturalWidth, firstEl.naturalHeight],
      orientation: firstEl.naturalWidth > firstEl.naturalHeight ? 'landscape' : 'portrait',
    })

    // jsPDF page operations must stay sequential
    for (let i = 0; i < processed.length; i++) {
      const { imgEl, compressed, fileType } = processed[i]
      const pageW = imgEl.naturalWidth
      const pageH = imgEl.naturalHeight

      if (i > 0) {
        doc.addPage([pageW, pageH], pageW > pageH ? 'landscape' : 'portrait')
      }

      if (compressed !== null) {
        doc.addImage(compressed, 'JPEG', 0, 0, pageW, pageH)
      } else {
        doc.addImage(imgEl, FORMAT_MAP[fileType] ?? 'JPEG', 0, 0, pageW, pageH)
      }
      tick()
    }

    doc.save(filename)
    console.log('[pdfService] generation complete —', filename)
  } catch (error) {
    console.error('[pdfService] generation error', error)
    throw error
  }
}

const PdfService = { generatePdf }
export default PdfService
