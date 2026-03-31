import './App.css';
import { createSignal, onCleanup, Show } from 'solid-js';
import Navbar from './components/Navbar';
import UploadZone from './components/UploadZone';
import ImageList from './components/ImageList';
import GenerateButton from './components/GenerateButton';
import ClearAllButton from './components/ClearAllButton';
import SizeSelector from './components/SizeSelector';
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
              <ClearAllButton imageCount={images().length} onClear={handleClearAll} />
              <SizeSelector
                value={sizeOption()}
                onChange={setSizeOption}
                disabled={isGenerating()}
              />
              <GenerateButton
                imageCount={images().length}
                isGenerating={isGenerating()}
                onGenerate={handleGenerate}
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
