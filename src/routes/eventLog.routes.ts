import { Hono } from 'hono'
import { getEventLogs, deleteEventLogs } from '../controllers/eventLog.controller.js'

export const eventLogRoutes = new Hono()

eventLogRoutes.get('/event-logs', getEventLogs)
eventLogRoutes.delete('/event-logs', deleteEventLogs)
