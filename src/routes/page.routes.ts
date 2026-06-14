import { Hono } from 'hono'
import { showIndex } from '../controllers/page.controller.js'

export const pageRoutes = new Hono()

pageRoutes.get('/', showIndex)
