import { PDFParse } from 'pdf-parse'

export interface MarkdownResult {
  markdown: string
  metadata: {
    pages: number
    title?: string
    author?: string
  }
}

export async function pdfBufferToMarkdown(buffer: Buffer): Promise<MarkdownResult> {
  const parser = new PDFParse({ data: buffer })
  try {
    const [textResult, infoResult] = await Promise.all([
      parser.getText({ pageJoiner: '' }),
      parser.getInfo(),
    ])

    const info = infoResult.info as Record<string, unknown>
    const title = typeof info?.Title === 'string' ? info.Title : undefined
    const author = typeof info?.Author === 'string' ? info.Author : undefined
    const pages = textResult.total

    const frontMatterLines = ['---']
    if (title) frontMatterLines.push(`title: "${title.replace(/"/g, '\\"')}"`)
    if (author) frontMatterLines.push(`author: "${author.replace(/"/g, '\\"')}"`)
    frontMatterLines.push(`pages: ${pages}`)
    frontMatterLines.push('---')

    const pageSections = textResult.pages.map(page => {
      const heading = `## Page ${page.num}`
      const content = page.text.trim()
      return `${heading}\n\n${content}`
    })

    const markdown = `${frontMatterLines.join('\n')}\n\n${pageSections.join('\n\n---\n\n')}`

    return { markdown, metadata: { pages, title, author } }
  } finally {
    await parser.destroy()
  }
}
