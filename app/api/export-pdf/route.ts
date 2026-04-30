import { NextRequest, NextResponse } from 'next/server'

// Server-side PDF generation via headless Chromium. Produces a vector PDF
// (selectable text, crisp at any zoom) — same path as Safari's Print to PDF.
// Used as the primary mobile export when window.print() is unavailable.

export const runtime = 'nodejs'
export const maxDuration = 60

const CHROMIUM_PACK_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v148.0.0/chromium-v148.0.0-pack.x64.tar'

interface ExportPdfBody {
  html: string
  filename?: string
}

async function launchBrowser() {
  const isLocal = process.env.NODE_ENV !== 'production' && !process.env.VERCEL
  const puppeteer = await import('puppeteer-core')

  if (isLocal) {
    const localPath = process.env.PUPPETEER_EXECUTABLE_PATH
      || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    return puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
      executablePath: localPath,
    })
  }

  const chromium = (await import('@sparticuz/chromium-min')).default
  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 2 },
    executablePath: await chromium.executablePath(CHROMIUM_PACK_URL),
    headless: true,
  })
}

export async function POST(req: NextRequest) {
  let body: ExportPdfBody
  try {
    body = (await req.json()) as ExportPdfBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.html || typeof body.html !== 'string') {
    return NextResponse.json({ error: 'html field is required' }, { status: 400 })
  }

  if (body.html.length > 5_000_000) {
    return NextResponse.json({ error: 'HTML payload too large (5MB max)' }, { status: 413 })
  }

  let browser: Awaited<ReturnType<typeof launchBrowser>> | null = null

  try {
    browser = await launchBrowser()
    const page = await browser.newPage()

    // Activate @media print rules during render so all our existing print
    // styles apply without any class hacks.
    await page.emulateMediaType('print')

    await page.setContent(body.html, { waitUntil: 'networkidle0', timeout: 30_000 })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '10mm', right: '10mm', bottom: '12mm', left: '10mm' },
    })

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${(body.filename || 'report').replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `PDF render failed: ${message}` }, { status: 500 })
  } finally {
    if (browser) await browser.close()
  }
}
