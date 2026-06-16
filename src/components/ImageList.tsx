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

  function handleDrop(targetId: string) {
    const fromId = draggingId()
    if (fromId) props.onReorder(fromId, targetId)
    setDraggingId(null)
    setDragOverId(null)
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
              draggable={true}
              onDragStart={(e) => {
                setDraggingId(image.id)
                e.dataTransfer!.effectAllowed = 'move'
              }}
              onDragEnd={() => {
                setDraggingId(null)
                setDragOverId(null)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer!.dropEffect = 'move'
                if (dragOverId() !== image.id) setDragOverId(image.id)
              }}
              onDragLeave={() => {
                if (dragOverId() === image.id) setDragOverId(null)
              }}
              onDrop={(e) => {
                e.preventDefault()
                handleDrop(image.id)
              }}
              class={`relative group rounded-xl overflow-hidden border bg-gray-100 dark:bg-gray-900 aspect-square cursor-move transition-all ${
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
