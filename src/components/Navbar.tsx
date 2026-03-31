import { createEffect, createSignal } from 'solid-js'
import StorageService from '../services/storage'
import logo from '../assets/logo.png'

type Theme = 'light' | 'dark'

const THEME_KEY = 'theme'

export default function Navbar() {
  const stored = StorageService.get<Theme>(THEME_KEY)
  const initial: Theme = stored === 'dark' ? 'dark' : 'light'

  const [theme, setTheme] = createSignal<Theme>(initial)

  // Reactively sync the `dark` class on <html> whenever theme changes.
  // createEffect runs synchronously on first execution (no DOM mutation at module load).
  createEffect(() => {
    document.documentElement.classList.toggle('dark', theme() === 'dark')
  })

  const toggle = () => {
    const next: Theme = theme() === 'light' ? 'dark' : 'light'
    setTheme(next)
    StorageService.set<Theme>(THEME_KEY, next)
  }

  return (
    <nav class="flex items-center justify-between px-6 py-3 glass border-b border-gray-200 dark:border-gray-700/20 shadow-glass sticky top-0 z-50">
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
    </nav>
  )
}
