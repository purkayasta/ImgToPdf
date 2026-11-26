// PDF pages are limited to 14,400 points on either axis. Treat source pixels as 96 dpi.
export function getPageSize(width: number, height: number): [number, number] {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('This image has invalid dimensions.')
  }
  const scale = Math.min(72 / 96, 14400 / Math.max(width, height))
  return [width * scale, height * scale]
}

export function getTargetBytes(option: string): number | null {
  if (option === '2mb') return 2 * 1024 * 1024
  if (option === '5mb') return 5 * 1024 * 1024
  return null
}

export function getFilename(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `imgtopdf-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.pdf`
}
