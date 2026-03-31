interface ClearAllButtonProps {
  imageCount: number
  onClear: () => void
  disabled?: boolean
}

export default function ClearAllButton(props: ClearAllButtonProps) {
  return (
    <button
      type="button"
      onClick={props.onClear}
      disabled={props.disabled || props.imageCount === 0}
      class="px-5 py-2 rounded-xl text-sm font-medium glass border border-red-300 dark:border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 active:bg-red-100 dark:active:bg-red-900/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shadow-glass hover:shadow-[0_8px_24px_rgba(220,38,38,0.12)] dark:hover:shadow-[0_8px_24px_rgba(239,68,68,0.15)]"
    >
      {/* Trash icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="inline mr-1.5"
      >
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </svg>
      Clear All
    </button>
  )
}
