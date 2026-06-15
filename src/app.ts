import { Hono } from 'hono'
import type { AppEnv } from './types/env.js'
import { traceIdMiddleware } from './middleware/traceId.middleware.js'
import { pageRoutes } from './routes/page.routes.js'
import { eventLogRoutes } from './routes/eventLog.routes.js'
import { pdfRoutes } from './routes/pdf.routes.js'

export const app = new Hono<AppEnv>()

app.use('*', traceIdMiddleware)

app.route('/', pageRoutes)
app.route('/', eventLogRoutes)
app.route('/', pdfRoutes)
