import type { Context } from 'hono'
import type { AppEnv } from '../types/env.js'
import path from 'path'
import fs from 'fs'

export function showIndex(c: Context<AppEnv>) {
  try {
    const html = fs.readFileSync(path.resolve('./src/views/upload.html'), 'utf-8')
    return c.html(html)
  } catch (err) {
    c.set('error', String(err))
    return c.text('Internal Server Error', 500)
  }
}
