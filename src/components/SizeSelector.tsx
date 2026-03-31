import { For } from 'solid-js'
import type { PdfSizeOption } from '../services/pdfService'

interface SizeSelectorProps {
  value: PdfSizeOption
  onChange: (value: PdfSizeOption) => void
  disabled?: boolean
}

const OPTIONS: { value: PdfSizeOption; label: string }[] = [
  { value: 'default', label: 'Default size' },
  { value: '5mb', label: 'Max 5 MB' },
  { value: '20mb', label: 'Max 20 MB' },
]

export default function SizeSelector(props: SizeSelectorProps) {
  return (
    <div class="relative">
      <select
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.currentTarget.value as PdfSizeOption)}
        class="h-[46px] w-full pl-4 pr-10 rounded-2xl glass border border-gray-200 dark:border-gray-700/30 text-gray-800 dark:text-gray-200 text-sm font-medium appearance-none cursor-pointer transition-all duration-200 hover:border-emerald-400 dark:hover:border-[#00d97e]/60 hover:shadow-glass focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-[#00d97e] focus:shadow-[0_12px_40px_rgba(16,217,124,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <For each={OPTIONS}>
          {(opt) => <option value={opt.value}>{opt.label}</option>}
        </For>
      </select>
      {/* Chevron icon */}
      <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 transition-colors duration-200">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>
    </div>
  )
}
