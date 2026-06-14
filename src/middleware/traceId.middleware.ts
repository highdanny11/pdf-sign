import type { MiddlewareHandler } from 'hono'
import type { AppEnv } from '../types/env.js'
import { writeEventLog } from '../models/eventLog.model.js'

export const traceIdMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const traceId = crypto.randomUUID()
  c.set('traceId', traceId)

  const start = Date.now()
  await next()

  writeEventLog({
    traceId,
    timestamp: new Date().toISOString(),
    method: c.req.method,
    path: new URL(c.req.url).pathname,
    status: c.res.status,
    duration: Date.now() - start,
    error: c.get('error'),
  })

  c.header('X-Trace-Id', traceId)
}
