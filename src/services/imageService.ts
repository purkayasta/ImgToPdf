import type { ImageFile } from '../types/image'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp']
const MAX_BYTES = 15 * 1024 * 1024 // 15 MB

// NOTE: file.type is set by the browser/OS based on file extension — it is not
// validated against actual file contents (magic bytes). For this client-side app
// the risk is low (jsPDF will simply fail to render a non-image), but any future
// server upload must re-validate on the backend.

export type ValidationError = 'INVALID_TYPE' | 'TOO_LARGE'

export interface ValidationResult {
  valid: boolean
  error?: ValidationError
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function validate(file: File): ValidationResult {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { valid: false, error: 'INVALID_TYPE' }
  }
  if (file.size > MAX_BYTES) {
    return { valid: false, error: 'TOO_LARGE' }
  }
  return { valid: true }
}

function createImageFile(file: File): ImageFile {
  return {
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
    name: file.name,
    sizeFormatted: formatSize(file.size),
  }
}

const ImageService = { validate, createImageFile }
export default ImageService
