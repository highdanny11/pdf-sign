import { Hono } from 'hono'
import type { AppEnv } from '../types/env.js'
import { pdfToHtml } from '../controllers/pdf.controller.js'

export const pdfRoutes = new Hono<AppEnv>()
pdfRoutes.post('/pdf/to-html', pdfToHtml)
