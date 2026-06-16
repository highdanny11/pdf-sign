import { Hono } from 'hono'
import type { AppEnv } from '../types/env.js'
import { pdfToHtml, pdfToMarkdown } from '../controllers/pdf.controller.js'

export const pdfRoutes = new Hono<AppEnv>()
pdfRoutes.post('/pdf/to-html', pdfToHtml)
pdfRoutes.post('/pdf/to-markdown', pdfToMarkdown)
