import { createSignal, For, onCleanup, Show } from 'solid-js'
import { DragDropProvider, DragDropSensors, SortableProvider, DragOverlay, createSortable, closestCenter, transformStyle } from '@thisbeyond/solid-dnd'
import type { ImageFile } from '../types/image'

interface CardProps {
  image: ImageFile
  index: number
  count: number
  disabled?: boolean
  onRemove: (id: string) => void
  onMove: (from: number, to: number) => void
  onPreview: (image: ImageFile) => void
}

function SortableCard(props: CardProps) {
  const sortable = createSortable(props.image.id)
  return (
    <li ref={sortable.ref} style={transformStyle(sortable.transform)} class={`image-card ${sortable.isActiveDraggable ? 'opacity-40' : ''}`}>
      <button type="button" disabled={props.disabled} class="image-preview" data-preview-id={props.image.id} onClick={() => props.onPreview(props.image)} aria-label={`Preview page ${props.index + 1}: ${props.image.name}`}>
        <img src={props.image.previewUrl} alt="" class="w-full h-full object-contain" width="480" height="480" loading="lazy" decoding="async" draggable="false" />
        <span class="page-number">{props.index + 1}</span>
      </button>
      <button type="button" disabled={props.disabled} class="icon-control absolute right-2 top-2 bg-white dark:bg-gray-900 touch-none cursor-grab active:cursor-grabbing" aria-label={`Drag page ${props.index + 1} to reorder; move buttons are also available`} onPointerDown={e => { if (!props.disabled) sortable.dragActivators.onpointerdown?.(e) }}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" /></svg>
      </button>
      <div class="px-3 pt-3">
        <p class="text-sm font-medium truncate" title={props.image.name}>{props.image.name}</p>
        <p class="text-xs text-gray-600 dark:text-gray-300 mt-1">{props.image.width} × {props.image.height} · {props.image.sizeFormatted}</p>
      </div>
      <div class="flex items-center justify-end px-1 py-2">
        <div class="flex">
          <button type="button" disabled={props.disabled || props.index === 0} class="icon-control" aria-label={`Move page ${props.index + 1} earlier`} onClick={() => props.onMove(props.index, props.index - 1)}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="m15 18-6-6 6-6" /></svg></button>
          <button type="button" disabled={props.disabled || props.index === props.count - 1} class="icon-control" aria-label={`Move page ${props.index + 1} later`} onClick={() => props.onMove(props.index, props.index + 1)}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="m9 6 6 6-6 6" /></svg></button>
          <button type="button" disabled={props.disabled} class="icon-control text-red-700 dark:text-red-300" aria-label={`Remove ${props.image.name}`} onClick={() => props.onRemove(props.image.id)}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="m6 6 12 12M6 18 18 6" /></svg></button>
        </div>
      </div>
    </li>
  )
}

interface ImageListProps {
  images: ImageFile[]
  disabled?: boolean
  onRemove: (id: string) => void
  onReorder: (fromId: string, toId: string) => void
}

export default function ImageList(props: ImageListProps) {
  let dialog!: HTMLDialogElement
  const [preview, setPreview] = createSignal<{ name: string; url: string }>()
  const [announcement, setAnnouncement] = createSignal('')
  function closePreview() {
    const current = preview()
    if (current) URL.revokeObjectURL(current.url)
    setPreview(undefined)
  }
  onCleanup(closePreview)
  function move(from: number, to: number) {
    if (props.disabled || from === to || !props.images[from] || !props.images[to]) return
    const name = props.images[from].name
    const id = props.images[from].id
    props.onReorder(props.images[from].id, props.images[to].id)
    setAnnouncement(`${name} moved to page ${to + 1}.`)
    document.querySelector<HTMLButtonElement>(`[data-preview-id="${id}"]`)?.focus({ preventScroll: true })
  }
  return (
    <section aria-label="Selected images" class="space-y-3">
      <p class="text-sm text-gray-600 dark:text-gray-300">{props.images.length} image{props.images.length !== 1 ? 's' : ''} selected. Preview a page or use the arrows to arrange it.</p>
      <p role="status" class="sr-only">{announcement()}</p>
      <DragDropProvider collisionDetector={closestCenter} onDragEnd={({ draggable, droppable }) => {
        if (droppable) move(props.images.findIndex(img => img.id === draggable.id), props.images.findIndex(img => img.id === droppable.id))
      }}>
        <DragDropSensors />
        <DragOverlay>{active => {
          const image = props.images.find(img => img.id === active?.id)
          return image ? <img src={image.previewUrl} alt="" class="w-40 h-40 object-contain bg-white dark:bg-gray-900 rounded-xl shadow-lg" /> : <></>
        }}</DragOverlay>
        <ol class="image-grid">
          <SortableProvider ids={props.images.map(img => img.id)}>
            <For each={props.images}>{(image, index) => <SortableCard image={image} index={index()} count={props.images.length} disabled={props.disabled} onRemove={props.onRemove} onMove={move} onPreview={image => {
              closePreview()
              setPreview({ name: image.name, url: URL.createObjectURL(image.file) })
              dialog.showModal()
            }} />}</For>
          </SortableProvider>
        </ol>
      </DragDropProvider>
      <dialog ref={dialog} aria-labelledby="preview-title" class="preview-dialog" onClose={closePreview} onClick={e => { if (e.target === e.currentTarget) dialog.close() }}>
        <Show when={preview()}>{current => <div class="p-4 sm:p-6">
          <div class="flex items-center justify-between gap-4 mb-4"><h2 id="preview-title" class="font-semibold truncate">{current().name}</h2><button type="button" class="control control-secondary" onClick={() => dialog.close()} autofocus>Close preview</button></div>
          <img src={current().url} alt={current().name} class="max-h-[70dvh] w-full object-contain" />
        </div>}</Show>
      </dialog>
    </section>
  )
}
