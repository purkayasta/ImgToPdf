interface WorkerScope {
  onmessage: ((e: MessageEvent) => unknown) | null
  postMessage(data: unknown, transfer?: Transferable[]): void
}
const workerSelf = self as unknown as WorkerScope

interface CompressInput {
  bitmap: ImageBitmap
  targetBytes?: number
  quality?: number
}

const MIN_QUALITY = 0.5
const MAX_ATTEMPTS = 12

workerSelf.onmessage = async (e: MessageEvent<CompressInput>): Promise<void> => {
  const { bitmap, targetBytes, quality } = e.data
  try {
    if (quality === undefined && (!targetBytes || targetBytes <= 0)) {
      throw new Error('The image has no compression budget.')
    }
    let width = bitmap.width
    let height = bitmap.height
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const canvas = new OffscreenCanvas(width, height)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Image compression is unavailable in this browser.')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(bitmap, 0, 0, width, height)
      let best = await canvas.convertToBlob({ type: 'image/jpeg', quality: quality ?? MIN_QUALITY })
      if (quality !== undefined || best.size <= targetBytes!) {
        if (quality === undefined) {
          let lo = MIN_QUALITY
          let hi = 0.95
          for (let i = 0; i < 8; i++) {
            const mid = (lo + hi) / 2
            const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: mid })
            if (blob.size <= targetBytes!) { best = blob; lo = mid } else { hi = mid }
          }
        }
        const buffer = await best.arrayBuffer()
        workerSelf.postMessage({ buffer }, [buffer])
        return
      }
      const scale = Math.min(0.85, Math.sqrt(targetBytes! / best.size) * 0.9)
      const nextWidth = Math.max(1, Math.floor(width * scale))
      const nextHeight = Math.max(1, Math.floor(height * scale))
      if (nextWidth === width && nextHeight === height) break
      width = nextWidth
      height = nextHeight
    }
    throw new Error('This image cannot fit the selected size. Choose a larger PDF size or fewer images.')
  } catch (error) {
    workerSelf.postMessage({ error: error instanceof Error ? error.message : 'Image compression failed. Try another image.' })
  } finally {
    bitmap.close()
  }
}
