import { Show } from 'solid-js'
import type { JSX } from 'solid-js/jsx-runtime'

interface ButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  icon?: JSX.Element
  loadingIcon?: JSX.Element
  loading?: boolean
  loadingLabel?: string
  variant?: 'green' | 'red'
}

export default function Button(props: ButtonProps) {
  const isRed = () => props.variant === 'red'

  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      class={`h-[42px] flex items-center gap-2.5 px-8 rounded-2xl font-semibold text-sm glass border transition-all duration-200 shadow-glass disabled:opacity-50 disabled:cursor-not-allowed ${
        isRed()
          ? 'border-red-300 dark:border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 active:bg-red-100 dark:active:bg-red-900/40 hover:shadow-[0_8px_24px_rgba(220,38,38,0.12)] dark:hover:shadow-[0_8px_24px_rgba(239,68,68,0.15)]'
          : 'border-emerald-300 dark:border-[#00d97e]/50 accent-green hover:bg-white/70 dark:hover:bg-black/60 active:bg-white/50 dark:active:bg-black/70 hover:shadow-[0_12px_48px_rgba(16,217,124,0.15)] dark:hover:shadow-[0_12px_48px_rgba(0,217,126,0.2)]'
      }`}
    >
      <Show when={props.icon || props.loadingIcon}>
        <Show when={props.loading} fallback={props.icon}>
          {props.loadingIcon}
        </Show>
      </Show>
      {props.loading ? (props.loadingLabel ?? props.label) : props.label}
    </button>
  )
}
