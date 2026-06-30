import { For } from 'solid-js'
import {
  DragDropProvider,
  DragDropSensors,
  SortableProvider,
  DragOverlay,
  createSortable,
  closestCenter,
  transformStyle,
} from '@thisbeyond/solid-dnd'
import type { ImageFile } from '../types/image'

interface CardProps {
  image: ImageFile
  onRemove: (id: string) => void
}

function SortableCard(props: CardProps) {
  const sortable = createSortable(props.image.id)
  return (
    <div
      use:sortable
      style={transformStyle(sortable.transform)}
      class={[
        'relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 aspect-square select-none touch-none cursor-grab transition-transform duration-200 will-change-transform',
        sortable.isActiveDraggable ? 'opacity-30 scale-95' : '',
      ].join(' ')}
    >
      <img
        src={props.image.previewUrl}
        alt={props.image.name}
        class="w-full h-full object-cover"
        draggable="false"
      />

      {/* Hover overlay with remove button */}
      <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-start justify-end p-1.5">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => props.onRemove(props.image.id)}
          aria-label={`Remove ${props.image.name}`}
          class="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity rounded-full bg-white/90 hover:bg-white p-1 text-gray-900 shadow"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Filename + size overlay at bottom */}
      <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-5 pointer-events-none">
        <p class="text-xs text-white font-medium truncate">{props.image.name}</p>
        <p class="text-white/70 text-[10px]">{props.image.sizeFormatted}</p>
      </div>
    </div>
  )
}

interface ImageListProps {
  images: ImageFile[]
  onRemove: (id: string) => void
  onReorder: (fromId: string, toId: string) => void
}

export default function ImageList(props: ImageListProps) {
  const ids = () => props.images.map((img) => img.id)

  return (
    <DragDropProvider
      onDragEnd={({ draggable, droppable }) => {
        if (droppable && draggable.id !== droppable.id) {
          props.onReorder(String(draggable.id), String(droppable.id))
        }
      }}
      collisionDetector={closestCenter}
    >
      <DragDropSensors />
      <DragOverlay class="will-change-transform">
        {(activeDraggable) => {
          if (!activeDraggable) return <></>
          const image = props.images.find((img) => img.id === activeDraggable.id)
          if (!image) return <></>
          return (
            <div
              class="rounded-xl overflow-hidden shadow-[0_20px_48px_rgba(0,0,0,0.45)] ring-2 ring-blue-500 opacity-95 scale-105"
              style={{
                width: `${activeDraggable.layout.width}px`,
                height: `${activeDraggable.layout.height}px`,
              }}
            >
              <img src={image.previewUrl} alt={image.name} class="w-full h-full object-cover" draggable="false" />
            </div>
          )
        }}
      </DragOverlay>

      <div class="w-full max-w-4xl mx-auto px-4">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
          {props.images.length} image{props.images.length !== 1 ? 's' : ''} selected
        </p>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <SortableProvider ids={ids()}>
            <For each={props.images}>
              {(image) => <SortableCard image={image} onRemove={props.onRemove} />}
            </For>
          </SortableProvider>
        </div>
      </div>
    </DragDropProvider>
  )
}
