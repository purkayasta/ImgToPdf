import { createSignal } from 'solid-js'
import logo from '../assets/logo.png'

function initialTheme(): boolean {
  try {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || saved === 'light') return saved === 'dark'
  } catch { /* Storage can be unavailable; the theme still works for this visit. */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export default function Navbar() {
  const [dark, setDark] = createSignal(initialTheme())
  document.documentElement.classList.toggle('dark', dark())
  function toggle() {
    const next = !dark()
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem('theme', next ? 'dark' : 'light') } catch { /* Optional persistence. */ }
  }
  return (
    <header class="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <nav aria-label="Main" class="max-w-5xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
        <a href={import.meta.env.BASE_URL} class="flex items-center gap-2 font-semibold text-lg shrink-0">
          <img src={logo} alt="" width="28" height="28" />
          ImgToPdf
        </a>
        <button type="button" onClick={toggle} aria-pressed={dark()} class="control control-secondary text-sm">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
          Dark mode
        </button>
      </nav>
    </header>
  )
}
