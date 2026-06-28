import { For, createSignal } from 'solid-js'
import type { ImageFile } from '../types/image'

interface ImageListProps {
  images: ImageFile[]
  onRemove: (id: string) => void
  onReorder: (fromId: string, toId: string) => void
}

export default function ImageList(props: ImageListProps) {
  const [draggingId, setDraggingId] = createSignal<string | null>(null)
  const [dragOverId, setDragOverId] = createSignal<string | null>(null)

  function onPointerDown(e: PointerEvent, id: string) {
    e.preventDefault()

    // Clone before setDraggingId so the ghost captures the undimmed card
    const source = e.currentTarget as HTMLElement
    const rect = source.getBoundingClientRect()
    const ghost = source.cloneNode(true) as HTMLElement
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top

    ghost.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      pointer-events: none;
      z-index: 9999;
      opacity: 0.92;
      transform: scale(1.06) rotate(2deg);
      box-shadow: 0 16px 40px rgba(0,0,0,0.35);
      border-radius: 0.75rem;
      overflow: hidden;
      transition: transform 0.1s ease;
    `
    document.body.appendChild(ghost)

    setDraggingId(id)

    function onMove(me: PointerEvent) {
      ghost.style.left = `${me.clientX - offsetX}px`
      ghost.style.top = `${me.clientY - offsetY}px`

      const el = document.elementFromPoint(me.clientX, me.clientY)
      const card = el?.closest('[data-image-id]') as HTMLElement | null
      const targetId = card?.dataset.imageId ?? null
      if (targetId !== dragOverId()) setDragOverId(targetId)
    }

    function onUp() {
      ghost.remove()
      const fromId = draggingId()
      const toId = dragOverId()
      if (fromId && toId && fromId !== toId) props.onReorder(fromId, toId)
      setDraggingId(null)
      setDragOverId(null)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  return (
    <div class="w-full max-w-4xl mx-auto px-4">
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
        {props.images.length} image{props.images.length !== 1 ? 's' : ''} selected
        <span class="text-gray-400 dark:text-gray-600"> · drag to reorder</span>
      </p>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <For each={props.images}>
          {(image, index) => (
            <div
              data-image-id={image.id}
              onPointerDown={(e) => onPointerDown(e, image.id)}
              class={`relative group rounded-xl overflow-hidden border bg-gray-100 dark:bg-gray-900 aspect-square cursor-grab touch-none transition-all ${
                draggingId() === image.id
                  ? 'opacity-40'
                  : dragOverId() === image.id
                    ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/50'
                    : 'border-gray-200 dark:border-gray-800'
              }`}
            >
              <img
                src={image.previewUrl}
                alt={image.name}
                class="w-full h-full object-cover pointer-events-none"
              />

              {/* Order badge */}
              <div class="absolute top-1.5 left-1.5 rounded-full bg-black/60 text-white text-[10px] font-semibold w-5 h-5 flex items-center justify-center pointer-events-none">
                {index() + 1}
              </div>

              {/* Hover overlay with remove button */}
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-start justify-end p-1.5">
                <button
                  type="button"
                  onClick={() => props.onRemove(image.id)}
                  aria-label={`Remove ${image.name}`}
                  class="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity rounded-full bg-white/90 hover:bg-white p-1 text-gray-900 shadow"
                >
                  {/* X icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Filename + size overlay at bottom */}
              <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-5 pointer-events-none">
                <p class="text-xs text-white font-medium truncate">{image.name}</p>
                <p class="text-white/70 text-[10px]">{image.sizeFormatted}</p>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
