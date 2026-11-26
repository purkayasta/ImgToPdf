import type { ImageFile } from '../types/image'

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp']
export const MAX_IMAGES = 50
const MAX_BYTES = 15 * 1024 * 1024
const MAX_PIXELS = 40_000_000
const MAX_DIMENSION = 32767

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function validate(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return 'Use a JPEG, PNG, WebP, GIF, or BMP image.'
  if (file.size > MAX_BYTES) return 'This image exceeds 15 MB. Choose a smaller file.'
  if (file.size === 0) return 'This file is empty. Choose another image.'
  return null
}

async function createImageFile(file: File): Promise<ImageFile> {
  const error = validate(file)
  if (error) throw new Error(error)
  const sourceUrl = URL.createObjectURL(file)
  const img = new Image()
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('This image took too long to open. Try another file.')), 30000)
      img.onload = () => { clearTimeout(timer); resolve() }
      img.onerror = () => { clearTimeout(timer); reject(new Error('This image could not be opened. Try another file.')) }
      img.src = sourceUrl
    })
    const width = img.naturalWidth
    const height = img.naturalHeight
    if (!width || !height || width * height > MAX_PIXELS || Math.max(width, height) > MAX_DIMENSION) {
      throw new Error('This image is too large to process safely. Resize it to 40 megapixels or less, with each side under 32,768 pixels.')
    }
    // Keep only a small thumbnail decoded in the grid, not every full-resolution source.
    const scale = Math.min(1, 480 / Math.max(width, height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Image previews are unavailable in this browser.')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const thumbnail = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not create a preview. Try another image.')), 'image/jpeg', 0.8)
    })
    return {
      id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(thumbnail),
      name: file.name, sizeFormatted: formatSize(file.size), width, height,
    }
  } finally {
    img.onload = null
    img.onerror = null
    img.src = ''
    URL.revokeObjectURL(sourceUrl)
  }
}

export default { validate, createImageFile, formatSize }
