import fs from 'fs'
import path from 'path'

const LOG_DIR = path.resolve('./logs')
const MAX_LOG_BYTES = 10 * 1024 * 1024  // 10 MB
const RETAIN_DAYS = 7

export interface EventLogEntry {
  traceId: string
  timestamp: string
  method: string
  path: string
  status: number
  duration: number
  error?: string
}

function todayLogFile(): string {
  const date = new Date().toISOString().slice(0, 10)
  return path.join(LOG_DIR, `event-${date}.log`)
}

function rotateIfNeeded(logFile: string): void {
  if (!fs.existsSync(logFile)) return
  if (fs.statSync(logFile).size < MAX_LOG_BYTES) return
  const base = path.basename(logFile, '.log')
  const existing = fs.readdirSync(LOG_DIR)
    .filter(f => f.startsWith(`${base}-v`) && f.endsWith('.log'))
  const nextVersion = existing.length + 1
  fs.renameSync(logFile, path.join(LOG_DIR, `${base}-v${nextVersion}.log`))
}

function purgeOldLogs(): void {
  if (!fs.existsSync(LOG_DIR)) return
  const cutoff = Date.now() - RETAIN_DAYS * 86_400_000
  fs.readdirSync(LOG_DIR)
    .filter(f => f.startsWith('event-') && f.endsWith('.log'))
    .filter(f => fs.statSync(path.join(LOG_DIR, f)).mtimeMs < cutoff)
    .forEach(f => fs.unlinkSync(path.join(LOG_DIR, f)))
}

export function writeEventLog(entry: EventLogEntry): void {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
  purgeOldLogs()
  const logFile = todayLogFile()
  rotateIfNeeded(logFile)
  fs.appendFileSync(logFile, JSON.stringify(entry) + '\n')
}

export function readEventLogs(traceId?: string): EventLogEntry[] {
  if (!fs.existsSync(LOG_DIR)) return []
  const files = fs.readdirSync(LOG_DIR)
    .filter(f => f.startsWith('event-') && f.endsWith('.log'))
    .sort()
  const entries: EventLogEntry[] = []
  for (const file of files) {
    fs.readFileSync(path.join(LOG_DIR, file), 'utf-8')
      .split('\n').filter(Boolean)
      .forEach(line => { try { entries.push(JSON.parse(line) as EventLogEntry) } catch { /* skip malformed */ } })
  }
  return traceId ? entries.filter(e => e.traceId === traceId) : entries
}

export function resetEventLog(): number {
  if (!fs.existsSync(LOG_DIR)) return 0
  let count = 0
  fs.readdirSync(LOG_DIR)
    .filter(f => f.startsWith('event-') && f.endsWith('.log'))
    .forEach(f => {
      count += fs.readFileSync(path.join(LOG_DIR, f), 'utf-8').split('\n').filter(Boolean).length
      fs.unlinkSync(path.join(LOG_DIR, f))
    })
  return count
}
