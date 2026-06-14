import path from 'path'

export function sanitizeFilename(name: string): string {
  return path.basename(name).replace(/[^\w.\-]/g, '_')
}
