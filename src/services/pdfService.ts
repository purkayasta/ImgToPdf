import { jsPDF } from 'jspdf'
import type { ImageFile } from '../types/image'
import CompressWorker from '../workers/compress.worker?worker'

export type PdfSizeOption = 'default' | 'high' | '2mb' | '5mb'

export interface SizeChoice {
  value: PdfSizeOption
  label: string
}

// Approximate overhead jsPDF adds beyond raw image bytes (metadata, xref table, etc.)
const PDF_OVERHEAD_BYTES = 75 * 1024 // 75 KB safety margin

// Fixed targets: an absolute cap on the whole PDF, regardless of image count.
const FIXED_TARGET_BYTES: Partial<Record<PdfSizeOption, number>> = {
  '2mb': 2 * 1024 * 1024,
  '5mb': 5 * 1024 * 1024,
}

// "High" is quality-driven, not size-driven: re-encode each image at this JPEG
// quality relative to its own resolution, never larger than the original. This
// keeps quality consistent whether the source is 400 KB or 10 MB.
const HIGH_QUALITY = 0.85

// Resolve the whole-PDF byte target for a size-capped option. null = not byte-capped
// (handled separately: 'default' embeds originals, 'high' re-encodes at HIGH_QUALITY).
function getTargetBytes(option: PdfSizeOption): number | null {
  return FIXED_TARGET_BYTES[option] ?? null
}

// Dropdown choices, ordered largest → smallest by intended quality.
function getSizeChoices(): SizeChoice[] {
  return [
    { value: 'default', label: 'Original Quality' },
    { value: 'high', label: 'High Quality' },
    { value: '5mb', label: 'Small (5 MB)' },
    { value: '2mb', label: 'Tiny (2 MB)' },
  ]
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
 * - `targetBytes`: binary-search quality (and downscale) to fit within the budget.
 * - `quality`: re-encode once at a fixed JPEG quality, full resolution (for "High").
 * Returns the compressed data as a Uint8Array ready for jsPDF.addImage.
 */
async function compressInWorker(
  imgEl: HTMLImageElement,
  opts: { targetBytes: number } | { quality: number },
): Promise<Uint8Array> {
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
    worker.postMessage({ bitmap, ...opts }, [bitmap])
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

  const targetBytes = getTargetBytes(sizeOption)
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
      let compressed: Uint8Array | null = null
      if (sizeOption === 'high') {
        // Re-encode at high quality; if that comes out larger than the source,
        // there's nothing to gain — embed the original instead.
        const out = await compressInWorker(imgEl, { quality: HIGH_QUALITY })
        compressed = out.byteLength < image.file.size ? out : null
      } else if (perImageBudget !== null) {
        compressed = await compressInWorker(imgEl, { targetBytes: perImageBudget })
      }
      tick()
      return { imgEl, compressed, fileType: image.file.type }
    }))

    // Redistribute unused budget: images that came in well under their equal share
    // (e.g. simple screenshots) free up space; hand it to images that were pinned at
    // their share (detailed photos that hit the ceiling) and re-compress just those.
    if (perImageBudget !== null && targetBytes !== null) {
      const budgetPool = targetBytes - PDF_OVERHEAD_BYTES
      const used = processed.reduce((sum, p) => sum + (p.compressed?.byteLength ?? 0), 0)
      const leftover = budgetPool - used
      // "Saturated" = landed at/near its budget, so more room would buy more quality.
      const saturated = processed.filter(
        (p) => (p.compressed?.byteLength ?? 0) >= perImageBudget * 0.95,
      )

      if (leftover > 1024 && saturated.length > 0) {
        const newBudget = perImageBudget + Math.floor(leftover / saturated.length)
        console.log(
          `[pdfService] redistributing ${(leftover / 1024).toFixed(1)} KB across ` +
            `${saturated.length} image(s) → new budget ${(newBudget / 1024).toFixed(1)} KB`,
        )
        await Promise.all(
          saturated.map(async (p) => {
            p.compressed = await compressInWorker(p.imgEl, { targetBytes: newBudget })
          }),
        )
      }
    }

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

const PdfService = { generatePdf, getSizeChoices }
export default PdfService
