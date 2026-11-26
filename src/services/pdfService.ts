import { jsPDF } from 'jspdf'
import type { ImageFile } from '../types/image'
import type { GenerationProgress, PdfSizeOption } from '../types/pdf'
import { getFilename, getPageSize, getTargetBytes } from '../utils/pdf'
import CompressWorker from '../workers/compress.worker?worker'

const FORMAT_MAP: Record<string, string> = {
  'image/jpeg': 'JPEG', 'image/png': 'PNG', 'image/webp': 'WEBP', 'image/gif': 'GIF', 'image/bmp': 'BMP',
}

async function compressImage(file: File, opts: { quality: number } | { targetBytes: number }, signal: AbortSignal): Promise<Uint8Array> {
  signal.throwIfAborted()
  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') {
    throw new Error('Compression is unavailable in this browser. Choose Original quality or use a newer browser.')
  }
  const bitmap = await createImageBitmap(file)
  if (signal.aborted) { bitmap.close(); signal.throwIfAborted() }
  return new Promise((resolve, reject) => {
    let worker: Worker | undefined
    const finish = (error?: Error, buffer?: ArrayBuffer) => {
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      worker?.terminate()
      bitmap.close()
      if (error) reject(error)
      else if (buffer?.byteLength) resolve(new Uint8Array(buffer))
      else reject(new Error('Image compression returned no data. Try another image.'))
    }
    const abort = () => finish(new DOMException('Generation cancelled.', 'AbortError'))
    const timer = setTimeout(() => finish(new Error('Image compression took too long. Try a smaller image.')), 120000)
    signal.addEventListener('abort', abort, { once: true })
    try {
      worker = new CompressWorker()
      worker.onmessage = (e: MessageEvent<{ buffer?: ArrayBuffer; error?: string }>) => {
        finish(e.data.error ? new Error(e.data.error) : undefined, e.data.buffer)
      }
      worker.onerror = () => finish(new Error('Image compression failed. Try Original quality or another image.'))
      worker.onmessageerror = () => finish(new Error('Could not read the compressed image. Please try again.'))
      worker.postMessage({ bitmap, ...opts }, [bitmap])
    } catch (error) {
      finish(error instanceof Error ? error : new Error('Could not start image compression.'))
    }
  })
}

interface GenerateOptions {
  signal: AbortSignal
  onProgress: (progress: GenerationProgress) => void
}

async function generatePdf(images: ImageFile[], option: PdfSizeOption, { signal, onProgress }: GenerateOptions): Promise<{ filename: string; size: number }> {
  if (!images.length) throw new Error('Add at least one image before generating a PDF.')
  const target = getTargetBytes(option)
  // Reserve PDF structure space; the finished Blob is checked again before download.
  let remaining = target === null ? Infinity : target - Math.max(75 * 1024, images.length * 2048)
  const firstSize = getPageSize(images[0].width, images[0].height)
  const doc = new jsPDF({
    unit: 'pt', format: firstSize, orientation: firstSize[0] > firstSize[1] ? 'landscape' : 'portrait', compress: true,
  })
  for (let i = 0; i < images.length; i++) {
    signal.throwIfAborted()
    const image = images[i]
    onProgress({ percent: Math.round(i / images.length * 90), message: `${option === 'default' ? 'Preparing' : 'Compressing'} image ${i + 1} of ${images.length}` })
    try {
      // Process one source at a time so decoded bitmaps and canvases never accumulate.
      let data: Uint8Array
      let format = FORMAT_MAP[image.file.type]
      if (target !== null) {
        data = await compressImage(image.file, { targetBytes: Math.floor(remaining / (images.length - i)) }, signal)
        remaining -= data.byteLength
        format = 'JPEG'
      } else if (option === 'high') {
        data = await compressImage(image.file, { quality: 0.85 }, signal)
        if (data.byteLength < image.file.size) format = 'JPEG'
        else data = new Uint8Array(await image.file.arrayBuffer())
      } else {
        data = new Uint8Array(await image.file.arrayBuffer())
      }
      signal.throwIfAborted()
      const [width, height] = getPageSize(image.width, image.height)
      if (i > 0) doc.addPage([width, height], width > height ? 'landscape' : 'portrait')
      doc.addImage(data, format, 0, 0, width, height, undefined, 'FAST')
    } catch (error) {
      signal.throwIfAborted()
      throw new Error(`${image.name}: ${error instanceof Error ? error.message : 'Could not add this image to the PDF.'}`)
    }
    // Yield between pages so cancellation and progress updates can reach the UI.
    await new Promise<void>(resolve => setTimeout(resolve, 0))
  }
  onProgress({ percent: 95, message: 'Finishing your PDF…' })
  await new Promise<void>(resolve => setTimeout(resolve, 0))
  signal.throwIfAborted()
  const blob = doc.output('blob')
  if (target !== null && blob.size > target) {
    throw new Error(`The PDF could not fit within ${option === '2mb' ? '2' : '5'} MB. Choose a larger size or fewer images.`)
  }
  signal.throwIfAborted()
  const filename = getFilename()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
  onProgress({ percent: 100, message: 'Your PDF is ready.' })
  return { filename, size: blob.size }
}

export default { generatePdf }
