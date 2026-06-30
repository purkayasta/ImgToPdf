import { createEffect, createSignal, Show } from 'solid-js'
import logo from '../assets/logo.png'

type Theme = 'light' | 'dark'

interface NavbarProps {
  progress?: number
  isGenerating?: boolean
}

export default function Navbar(props: NavbarProps) {
  const [theme, setTheme] = createSignal<Theme>(
    localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
  )

  createEffect(() => {
    document.documentElement.classList.toggle('dark', theme() === 'dark')
  })

  const toggle = () => {
    const next: Theme = theme() === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('theme', next)
  }

  return (
    <nav class="relative flex items-center justify-between px-6 py-3 glass border-b border-gray-200 dark:border-gray-700/20 shadow-glass sticky top-0 z-50">
      <div class="flex items-center gap-2">
        <img src={logo} alt="ImgToPdf logo" class="h-7 w-7 object-contain" />
        <span class="text-lg font-semibold text-gray-900 dark:text-white">Image to Pdf</span>
      </div>

      <button
        type="button"
        onClick={toggle}
        aria-label="Toggle theme"
        class="flex items-center gap-0 rounded-full bg-gray-100 dark:bg-gray-800 p-1 transition-colors"
      >
        <span
          class={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-all ${
            theme() === 'light'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
          Light
        </span>
        <span
          class={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-all ${
            theme() === 'dark'
              ? 'bg-gray-900 text-white shadow-sm'
              : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
          Dark
        </span>
      </button>
      <Show when={props.isGenerating}>
        <div class="absolute bottom-[-2px] left-0 right-0 h-[4px]">
          <div
            class="h-full bg-[#00d97e] transition-all duration-200 will-change-[width]"
            style={{
              width: `${props.progress ?? 0}%`,
              background: '#facc15',
              'box-shadow': '0 0 12px 4px #facc15, 0 0 24px 8px rgba(250,204,21,0.5)',
            }}
          />
        </div>
      </Show>
    </nav>
  )
}
