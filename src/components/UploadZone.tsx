import { createSignal, Show } from 'solid-js'
import { ACCEPTED_TYPES } from '../services/imageService'

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void
  compact?: boolean
  disabled?: boolean
}

export default function UploadZone(props: UploadZoneProps) {
  let inputRef!: HTMLInputElement
  const [isDragOver, setIsDragOver] = createSignal(false)

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    if (!props.disabled && e.dataTransfer) props.onFilesSelected(Array.from(e.dataTransfer.files))
  }

  return (
    <div class={`w-full mx-auto ${props.compact ? '' : 'max-w-xl'}`}>
      <input ref={inputRef} type="file" accept={ACCEPTED_TYPES.join(',')} multiple disabled={props.disabled} class="hidden" aria-label="Choose images" onChange={e => {
        const files = Array.from(e.currentTarget.files ?? [])
        e.currentTarget.value = ''
        if (files.length) props.onFilesSelected(files)
      }} />
      <button type="button" disabled={props.disabled} class={`upload-zone ${props.compact ? 'py-6' : 'py-12 sm:py-16'} ${isDragOver() ? 'upload-zone-active' : ''}`} onClick={() => inputRef.click()}
        onDragOver={e => { e.preventDefault(); if (!props.disabled) setIsDragOver(true) }}
        onDragLeave={e => { if (!(e.relatedTarget instanceof Node) || !e.currentTarget.contains(e.relatedTarget)) setIsDragOver(false) }} onDrop={handleDrop}>
        <svg aria-hidden="true" width={props.compact ? 24 : 36} height={props.compact ? 24 : 36} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5v14M5 12h14" /></svg>
        <span class="font-semibold">{props.compact ? 'Add more images' : 'Choose images or drop them here'}</span>
        <Show when={!props.compact}>
          <span class="text-sm text-gray-600 dark:text-gray-300 px-4">JPEG, PNG, WebP, GIF, BMP · up to 50 images · 15 MB each</span>
        </Show>
      </button>
    </div>
  )
}
