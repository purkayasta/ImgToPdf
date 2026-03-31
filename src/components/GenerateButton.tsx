import { Show } from 'solid-js'

interface GenerateButtonProps {
  imageCount: number
  isGenerating: boolean
  onGenerate: () => void
}

export default function GenerateButton(props: GenerateButtonProps) {
  return (
    <button
      type="button"
      onClick={props.onGenerate}
      disabled={props.isGenerating || props.imageCount === 0}
      class="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-semibold text-sm glass border border-emerald-300 dark:border-[#00d97e]/50 accent-green hover:bg-white/70 dark:hover:bg-black/60 active:bg-white/50 dark:active:bg-black/70 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-glass hover:shadow-[0_12px_48px_rgba(16,217,124,0.15)] dark:hover:shadow-[0_12px_48px_rgba(0,217,126,0.2)]"
    >
        <Show
          when={props.isGenerating}
          fallback={
            /* PDF file icon */
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          }
        >
          {/* Spinning loader */}
          <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </Show>
        {props.isGenerating ? 'Generating PDF…' : `Generate PDF (${props.imageCount})`}
    </button>
  )
}
