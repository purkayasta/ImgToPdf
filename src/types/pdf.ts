export type PdfSizeOption = 'default' | 'high' | '2mb' | '5mb'

export const PDF_SIZE_CHOICES: { value: PdfSizeOption; label: string }[] = [
  { value: 'default', label: 'Original quality' },
  { value: 'high', label: 'High quality' },
  { value: '5mb', label: 'Small · 5 MB' },
  { value: '2mb', label: 'Tiny · 2 MB' },
]

export interface GenerationProgress {
  percent: number
  message: string
}
