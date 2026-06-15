declare module 'pdftohtmljs' {
  interface PdfConverter {
    add_options(options: string[]): this
    convert(preset?: string): Promise<string>
    progress(callback: (p: { current: number; total: number }) => void): this
  }
  export default function pdftohtmljs(
    filename: string,
    outfile?: string | null,
    options?: Record<string, unknown>
  ): PdfConverter
}
