import './App.css';
import { createSignal, onCleanup, Show, For } from 'solid-js';
import Navbar from './components/Navbar';
import UploadZone from './components/UploadZone';
import ImageList from './components/ImageList';
import Button from './components/Button';
import ImageService from './services/imageService';
import PdfService from './services/pdfService';
import type { PdfSizeOption } from './services/pdfService';
import type { ImageFile } from './types/image';

const MAX_IMAGES = 50;

export default function App() {
  const [images, setImages] = createSignal<ImageFile[]>([]);
  const [isGenerating, setIsGenerating] = createSignal(false);
  const [sizeOption, setSizeOption] = createSignal<PdfSizeOption>('default');

  onCleanup(() => {
    images().forEach((img) => URL.revokeObjectURL(img.previewUrl));
  });

  function handleFilesAdded(files: File[]) {
    const remaining = MAX_IMAGES - images().length;

    if (remaining <= 0) {
      console.warn(`[App] image limit of ${MAX_IMAGES} reached — no files added`);
      return;
    }

    if (files.length > remaining) {
      console.warn(
        `[App] only ${remaining} of ${files.length} file(s) accepted — limit is ${MAX_IMAGES}`,
      );
    }

    const newImageFiles: ImageFile[] = [];

    for (const file of files.slice(0, remaining)) {
      const result = ImageService.validate(file);
      if (!result.valid) {
        console.warn(`[App] rejected file "${file.name}" — reason: ${result.error}`);
        continue;
      }
      newImageFiles.push(ImageService.createImageFile(file));
    }

    if (newImageFiles.length === 0) return;

    console.log('[App] files added:', newImageFiles.length, newImageFiles.map((f) => f.name));
    setImages((prev) => [...prev, ...newImageFiles]);
  }

  function handleRemove(id: string) {
    const target = images().find((img) => img.id === id);
    if (!target) return;

    URL.revokeObjectURL(target.previewUrl);
    console.log('[App] file removed:', target.name);
    setImages((prev) => prev.filter((img) => img.id !== id));
  }

  function handleClearAll() {
    images().forEach((img) => URL.revokeObjectURL(img.previewUrl));
    console.log('[App] all files cleared');
    setImages([]);
  }

  async function handleGenerate() {
    console.log('[App] generate PDF clicked —', images().length, 'image(s), size option:', sizeOption());
    setIsGenerating(true);
    try {
      await PdfService.generatePdf(images(), sizeOption());
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div class="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white relative">
      <Navbar />
      <main>
        <Show
          when={images().length > 0}
          fallback={<UploadZone onFilesSelected={handleFilesAdded} />}
        >
          <div class="flex flex-col items-center pt-8 gap-6">
            <UploadZone compact onFilesSelected={handleFilesAdded} />
            <ImageList images={images()} onRemove={handleRemove} />
            <div class="flex flex-col sm:flex-row items-center justify-center gap-3 pb-12 px-4">
              <Button
                label="Clear All"
                onClick={handleClearAll}
                disabled={images().length === 0}
                variant="red"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                }
              />
              <div class="relative">
                <select
                  value={sizeOption()}
                  disabled={isGenerating()}
                  onChange={(e) => setSizeOption(e.currentTarget.value as PdfSizeOption)}
                  class={`h-[42px] w-full pl-4 pr-10 rounded-2xl glass text-sm font-medium appearance-none cursor-pointer transition-all duration-200 hover:bg-white/70 dark:hover:bg-black/60 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-glass ${
                    sizeOption() === 'default'
                      ? 'border border-blue-400 dark:border-blue-400/60 accent-blue text-blue-600 dark:text-blue-400 hover:shadow-[0_12px_48px_rgba(59,130,246,0.15)] dark:hover:shadow-[0_12px_48px_rgba(96,165,250,0.2)] focus:ring-blue-500 dark:focus:ring-blue-400'
                      : 'border border-emerald-300 dark:border-[#00d97e]/50 accent-green hover:shadow-[0_12px_48px_rgba(16,217,124,0.15)] dark:hover:shadow-[0_12px_48px_rgba(0,217,126,0.2)] focus:ring-emerald-500 dark:focus:ring-[#00d97e]'
                  }`}
                >
                  <For each={[
                    { value: 'default', label: 'Original Quality' },
                    { value: '5mb', label: 'Max 5 MB' },
                    { value: '20mb', label: 'Max 20 MB' },
                  ] as { value: PdfSizeOption; label: string }[]}>
                    {(opt) => <option value={opt.value}>{opt.label}</option>}
                  </For>
                </select>
                <span class={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-200 ${sizeOption() === 'default' ? 'text-blue-500 dark:text-blue-400' : 'text-emerald-500 dark:text-[#00d97e]'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </div>
              <Button
                label="Generate PDF"
                onClick={handleGenerate}
                disabled={isGenerating() || images().length === 0}
                variant="green"
                loading={isGenerating()}
                loadingLabel="Generating PDF…"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                }
                loadingIcon={
                  <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                }
              />
            </div>
          </div>
        </Show>
      </main>
      <div class="fixed bottom-4 right-5 text-xs select-none">
        <p class="text-gray-400 dark:text-gray-600 hover:text-emerald-600 dark:hover:text-[#00d97e] hover:glow-accent hover:underline transition-all duration-200">
          <a
            href="https://www.linkedin.com/in/purkayasta/"
            target="_blank"
            rel="noopener noreferrer"
          >
            made with solid + tailwind + vite + claude ❤️ by pritom
          </a>
        </p>
      </div>
    </div>
  );
}
