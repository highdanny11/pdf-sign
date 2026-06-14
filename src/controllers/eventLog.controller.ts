import type { Context } from 'hono'
import { readEventLogs, resetEventLog } from '../models/eventLog.model.js'

export function getEventLogs(c: Context) {
  const traceId = c.req.query('traceId')
  return c.json(readEventLogs(traceId))
}

export function deleteEventLogs(c: Context) {
  const deleted = resetEventLog()
  return c.json({ deleted })
}
