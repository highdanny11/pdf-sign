import pdftohtmljs from 'pdftohtmljs'
import { writeFile, readFile, rm, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

export async function pdfBufferToHtml(buffer: Buffer): Promise<string> {
  const tempDir = join(tmpdir(), `pdf-convert-${randomUUID()}`)
  await mkdir(tempDir)
  try {
    const inputPath = join(tempDir, 'input.pdf')
    await writeFile(inputPath, buffer)
    const converter = pdftohtmljs(inputPath, 'output.html', {})
    converter.add_options([
      `--dest-dir ${tempDir}`,
      '--embed-css 1',
      '--embed-font 1',
      '--embed-image 1',
      '--embed-javascript 1',
    ])
    await converter.convert()
    return await readFile(join(tempDir, 'output.html'), 'utf-8')
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}
