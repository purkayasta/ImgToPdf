function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
  );
}

function LogoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"
      className="w-8 h-8" aria-hidden="true">
      <rect x="4" y="2" width="18" height="24" rx="2"
        className="fill-indigo-600 dark:fill-indigo-400" />
      <path d="M22 8h4l-4-6v6Z"
        className="fill-indigo-400 dark:fill-indigo-300" />
      <path d="M10 16h8M10 20h5"
        stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function Navbar({ isDark, onToggle }) {
  return (
    <nav className="w-full flex items-center justify-between px-4 py-3
                    bg-white dark:bg-gray-900
                    border-b border-gray-200 dark:border-gray-700
                    shadow-sm">
      {/* Left: logo + brand name */}
      <div className="flex items-center gap-2">
        <LogoIcon />
        <span className="text-lg font-semibold tracking-tight
                         text-gray-900 dark:text-gray-100">
          ImgToPdf
        </span>
      </div>

      {/* Right: theme toggle */}
      <button
        onClick={onToggle}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="rounded-lg p-2
                   text-gray-600 dark:text-gray-300
                   hover:bg-gray-100 dark:hover:bg-gray-800
                   transition-colors duration-200
                   focus-visible:outline-none focus-visible:ring-2
                   focus-visible:ring-indigo-500"
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
      </button>
    </nav>
  );
}
