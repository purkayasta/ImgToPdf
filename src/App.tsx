import './App.css'
import { createSignal, For, onCleanup, Show } from 'solid-js'
import Navbar from './components/Navbar'
import UploadZone from './components/UploadZone'
import ImageList from './components/ImageList'
import Button from './components/Button'
import ImageService, { MAX_IMAGES } from './services/imageService'
import { PDF_SIZE_CHOICES } from './types/pdf'
import type { GenerationProgress, PdfSizeOption } from './types/pdf'
import type { ImageFile } from './types/image'

export default function App() {
  const [images, setImages] = createSignal<ImageFile[]>([])
  const [isAdding, setIsAdding] = createSignal(false)
  const [isGenerating, setIsGenerating] = createSignal(false)
  const [progress, setProgress] = createSignal<GenerationProgress>({ percent: 0, message: '' })
  const [sizeOption, setSizeOption] = createSignal<PdfSizeOption>('default')
  const [errors, setErrors] = createSignal<string[]>([])
  const [message, setMessage] = createSignal('')
  const [clearedImages, setClearedImages] = createSignal<ImageFile[]>([])
  const busy = () => isAdding() || isGenerating()
  let controller: AbortController | undefined
  let disposed = false
  let uploadButtonHost!: HTMLDivElement
  const release = (items: ImageFile[]) => items.forEach(img => URL.revokeObjectURL(img.previewUrl))

  onCleanup(() => {
    disposed = true
    controller?.abort()
    release(images())
    release(clearedImages())
  })

  function discardUndo() {
    release(clearedImages())
    setClearedImages([])
  }

  async function handleFilesAdded(files: File[]) {
    if (busy()) return
    setIsAdding(true)
    setErrors([])
    setMessage('Checking your images…')
    discardUndo()
    const accepted: ImageFile[] = []
    const rejected: string[] = []
    try {
      for (const file of files) {
        if (images().length + accepted.length >= MAX_IMAGES) {
          rejected.push(`You can add up to ${MAX_IMAGES} images. The remaining ${files.length - accepted.length - rejected.length} file(s) were not added.`)
          break
        }
        try {
          const image = await ImageService.createImageFile(file)
          if (disposed) { release([image]); break }
          accepted.push(image)
        } catch (error) {
          rejected.push(`${file.name}: ${error instanceof Error ? error.message : 'Could not open this image.'}`)
        }
        if (disposed) break
      }
      if (disposed) { release(accepted); return }
      setImages(previous => [...previous, ...accepted])
      setErrors(rejected)
      setMessage(accepted.length ? `Added ${accepted.length} image${accepted.length === 1 ? '' : 's'}.` : '')
    } finally {
      if (!disposed) {
        setIsAdding(false)
        // The empty upload control is replaced after the first successful addition.
        uploadButtonHost.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
      }
    }
  }

  function handleRemove(id: string) {
    if (busy()) return
    const image = images().find(img => img.id === id)
    if (!image) return
    const index = images().findIndex(img => img.id === id)
    release([image])
    setImages(previous => previous.filter(img => img.id !== id))
    setMessage(`Removed ${image.name}.`)
    const next = images()[Math.min(index, images().length - 1)]
    if (next) document.querySelector<HTMLButtonElement>(`[data-preview-id="${next.id}"]`)?.focus({ preventScroll: true })
    else uploadButtonHost.querySelector<HTMLButtonElement>('button')?.focus()
  }

  function handleReorder(fromId: string, toId: string) {
    if (busy()) return
    setImages(previous => {
      const reordered = [...previous]
      const from = reordered.findIndex(img => img.id === fromId)
      const to = reordered.findIndex(img => img.id === toId)
      if (from < 0 || to < 0 || from === to) return previous
      reordered.splice(to, 0, reordered.splice(from, 1)[0])
      return reordered
    })
  }

  function handleClearAll() {
    if (busy()) return
    discardUndo()
    setClearedImages(images())
    setImages([])
    setErrors([])
    setMessage('Images cleared.')
    uploadButtonHost.querySelector<HTMLButtonElement>('button')?.focus()
  }

  async function handleGenerate() {
    if (busy() || !images().length) return
    controller = new AbortController()
    const job = controller
    setIsGenerating(true)
    setErrors([])
    setMessage('')
    setProgress({ percent: 0, message: 'Preparing your PDF…' })
    try {
      // Keep jsPDF and its codecs out of the initial page load.
      const { default: PdfService } = await import('./services/pdfService')
      job.signal.throwIfAborted()
      const result = await PdfService.generatePdf([...images()], sizeOption(), { signal: job.signal, onProgress: setProgress })
      setMessage(`Your PDF is ready (${ImageService.formatSize(result.size)}). If the download did not start, generate it again.`)
    } catch (error) {
      if (!disposed) {
        if (job.signal.aborted) setMessage('Generation cancelled. Your images are ready when you are.')
        else setErrors([error instanceof Error ? error.message : 'Could not generate your PDF. Please try again.'])
      }
    } finally {
      if (!disposed) setIsGenerating(false)
      controller = undefined
    }
  }

  return (
    <div class="min-h-dvh flex flex-col bg-white dark:bg-gray-950 text-gray-950 dark:text-gray-100">
      <a href="#main" class="sr-only focus:not-sr-only focus:p-3">Skip to content</a>
      <Navbar />
      <main id="main" class="w-full max-w-4xl mx-auto flex-1 px-4 sm:px-6 pt-10 sm:pt-14 pb-8 space-y-6">
        <div class="text-center space-y-3 mb-8">
          <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight">Turn images into a PDF</h1>
          <p class="text-gray-600 dark:text-gray-300">Add your images, arrange the pages, and choose a size.</p>
          <p class="text-sm text-emerald-800 dark:text-emerald-300">Your files stay on this device.</p>
        </div>
        <div ref={uploadButtonHost}><UploadZone compact={images().length > 0} disabled={busy()} onFilesSelected={handleFilesAdded} /></div>
        <Show when={errors().length}>
          <div role="alert" class="message-error">
            <p class="font-semibold mb-1">Please check the following</p>
            <ul class="list-disc pl-5 space-y-1"><For each={errors()}>{error => <li class="break-words">{error}</li>}</For></ul>
          </div>
        </Show>
        <div role="status" aria-live="polite" aria-atomic="true" class="text-sm text-gray-700 dark:text-gray-200">
          {isGenerating() ? progress().message : message()}
          <Show when={clearedImages().length}>
            <button type="button" class="control control-secondary ml-3" onClick={() => {
              setImages(clearedImages()); setClearedImages([]); setMessage('Images restored.')
            }}>Undo clear</button>
          </Show>
        </div>
        <Show when={images().length}>
          <ImageList images={images()} disabled={busy()} onRemove={handleRemove} onReorder={handleReorder} />
          <div class="generation-toolbar">
            <Show when={isGenerating()}><p aria-hidden="true" class="w-full text-sm text-gray-700 dark:text-gray-200">{progress().message}</p></Show>
            <div class="flex flex-col gap-2 flex-1 min-w-0">
              <label for="pdf-size" class="text-sm font-medium">PDF quality &amp; size</label>
              <select id="pdf-size" value={sizeOption()} disabled={busy()} onChange={e => setSizeOption(e.currentTarget.value as PdfSizeOption)} class="control control-secondary w-full sm:w-auto">
                <For each={PDF_SIZE_CHOICES}>{choice => <option value={choice.value}>{choice.label}</option>}</For>
              </select>
            </div>
            <div class="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <Show when={isGenerating()} fallback={<Button label="Clear all" onClick={handleClearAll} disabled={busy()} variant="secondary" />}>
                <Button label="Cancel generation" onClick={() => controller?.abort()} variant="secondary" />
              </Show>
              <Button label={isGenerating() ? 'Generating PDF…' : 'Generate PDF'} onClick={handleGenerate} disabled={busy()} variant="primary" loading={isGenerating()} />
            </div>
            <Show when={isGenerating()}>
              <div class="w-full h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700" role="progressbar" aria-label="PDF generation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress().percent} aria-valuetext={progress().message}>
                <div class="h-full bg-emerald-700 dark:bg-emerald-400" style={{ width: `${progress().percent}%` }} />
              </div>
            </Show>
          </div>
        </Show>
      </main>
      <footer class="px-4 py-6 text-center text-sm text-gray-600 dark:text-gray-300">
        Made by <a href="https://www.linkedin.com/in/purkayasta/" target="_blank" rel="noopener noreferrer" class="underline underline-offset-4 hover:text-emerald-800 dark:hover:text-emerald-300">Pritom</a>
      </footer>
    </div>
  )
}
