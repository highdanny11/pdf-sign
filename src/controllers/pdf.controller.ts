import type { Context } from 'hono'
import type { AppEnv } from '../types/env.js'
import { z } from 'zod'
import { pdfBufferToHtml } from '../utils/pdfToHtml.js'
import { pdfBufferToMarkdown } from '../utils/pdfToMarkdown.js'

const MAX_PDF_BYTES = 50 * 1024 * 1024

const UploadSchema = z.object({
  file: z.instanceof(File)
    .refine(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
      { message: 'File must be a PDF' })
    .refine(f => f.size > 0, { message: 'File must not be empty' })
    .refine(f => f.size <= MAX_PDF_BYTES, { message: 'File exceeds 50 MB limit' })
})

export async function pdfToHtml(c: Context<AppEnv>) {
  try {
    const body = await c.req.parseBody()
    const result = UploadSchema.safeParse(body)
    if (!result.success) {
      return c.json({ error: result.error.issues[0]?.message ?? 'Invalid input' }, 400)
    }
    const arrayBuffer = await result.data.file.arrayBuffer()
    const html = await pdfBufferToHtml(Buffer.from(arrayBuffer))
    return c.json({ html })
  } catch (err) {
    c.set('error', String(err))
    return c.json({ error: 'PDF conversion failed' }, 500)
  }
}

export async function pdfToMarkdown(c: Context<AppEnv>) {
  try {
    const body = await c.req.parseBody()
    const result = UploadSchema.safeParse(body)
    if (!result.success) {
      return c.json({ error: result.error.issues[0]?.message ?? 'Invalid input' }, 400)
    }
    const arrayBuffer = await result.data.file.arrayBuffer()
    const { markdown, metadata } = await pdfBufferToMarkdown(Buffer.from(arrayBuffer))
    return c.json({ markdown, metadata })
  } catch (err) {
    c.set('error', String(err))
    return c.json({ error: 'PDF conversion failed' }, 500)
  }
}
