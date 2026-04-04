import { createSignal, Show } from 'solid-js'

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void
  compact?: boolean
}

export default function UploadZone(props: UploadZoneProps) {
  let inputRef!: HTMLInputElement

  // Drag and focus state live here — the parent only needs to know about selected files
  const [isDragOver, setIsDragOver] = createSignal(false)
  const [isFocused, setIsFocused] = createSignal(false)

  function handleChange(e: Event) {
    const input = e.target as HTMLInputElement
    const files = Array.from(input.files ?? [])
    if (files.length > 0) {
      console.log('[UploadZone] files selected via input:', files.length)
      props.onFilesSelected(files)
    }
    // Reset so the same file can be re-selected after removal
    input.value = ''
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    if (!e.dataTransfer) return
    const files = Array.from(e.dataTransfer.files)
    console.log('[UploadZone] files dropped:', files.length)
    props.onFilesSelected(files)
  }

  const borderClass = () =>
    isDragOver() || isFocused()
      ? 'glass border-emerald-400 dark:border-[#00d97e] shadow-[0_12px_40px_rgba(16,217,124,0.2)] dark:shadow-[0_12px_40px_rgba(0,217,126,0.3)]'
      : 'glass border-gray-200 dark:border-gray-700/30 hover:border-emerald-400 dark:hover:border-[#00d97e]/60 hover:shadow-glass transition-all duration-200'

  // 57px = navbar height (py-3 top+bottom = 24px + text-lg line-height ≈ 33px)
  const wrapperClass = () =>
    props.compact
      ? 'w-full max-w-4xl mx-auto px-4'
      : 'flex items-center justify-center min-h-[calc(100vh-57px)] px-4'

  return (
    <div class={wrapperClass()}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload images"
        class={`flex flex-col items-center justify-center gap-3 w-full max-w-md mx-auto rounded-2xl border-2 border-dashed cursor-pointer transition-colors select-none outline-none focus:ring-2 focus:ring-violet-400 ${props.compact ? 'p-6' : 'p-12'} ${borderClass()}`}
        onClick={() => inputRef.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ' ? inputRef.click() : undefined)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          class="hidden"
          onChange={handleChange}
        />
        <span
          class={`font-thin text-gray-400 dark:text-gray-500 leading-none ${props.compact ? 'text-4xl' : 'text-7xl'}`}
        >
          +
        </span>
        <span
          class={`font-medium text-gray-600 dark:text-gray-300 text-center ${props.compact ? 'text-sm' : 'text-base'}`}
        >
          {props.compact ? 'Add more images' : 'Click or drag images here'}
        </span>
        <Show when={!props.compact}>
          <span class="text-xs text-gray-400 dark:text-gray-600">
            PNG, JPG, WEBP, GIF, BMP — max 15 MB each
          </span>
        </Show>
      </div>
    </div>
  )
}
