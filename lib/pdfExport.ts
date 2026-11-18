// Mobile PDF export. window.print() silent-fails in Arc/Telegram/etc. WKWebView
// browsers, so we POST the print-only DOM + collected CSS to /api/export-pdf,
// which renders a vector PDF via headless Chromium (same engine as Safari's
// Print to PDF). The result is a real PDF with selectable text, crisp at any
// zoom — not a rasterized canvas screenshot.

interface ExportOptions {
  filename: string
}

export async function exportDashboardToPdf(rootEl: HTMLElement, { filename }: ExportOptions) {
  const html = await buildPrintableHtml(rootEl)

  const res = await fetch('/api/export-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, filename }),
  })

  if (!res.ok) {
    let message = `Сервер вернул ${res.status}`
    try {
      const data = await res.json()
      if (data?.error) message = String(data.error)
    } catch { /* not JSON */ }
    throw new Error(message)
  }

  const blob = await res.blob()
  triggerDownload(blob, filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}

export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 767px)').matches
}

// Build a self-contained HTML document with all current page CSS inlined so
// the server-side Chromium can render the same visual output without needing
// to fetch our app's CSS chunks.
async function buildPrintableHtml(rootEl: HTMLElement): Promise<string> {
  const cssChunks: string[] = []

  for (const sheet of Array.from(document.styleSheets)) {
    // url() in a stylesheet is relative to the sheet's own URL (e.g. the Inter
    // font is `../media/x.woff2` from /_next/static/chunks/). Once the CSS is
    // inlined those paths would resolve against the page and 404, so the server
    // Chromium silently fell back to its default font. Make them absolute.
    const baseHref = sheet.href || document.baseURI
    try {
      const rules = sheet.cssRules
      let chunk = ''
      for (const rule of Array.from(rules)) {
        chunk += rule.cssText + '\n'
      }
      cssChunks.push(absolutizeCssUrls(chunk, baseHref))
    } catch {
      if (sheet.href) {
        try {
          const r = await fetch(sheet.href)
          if (r.ok) cssChunks.push(absolutizeCssUrls(await r.text(), baseHref))
        } catch { /* ignore unreachable sheet */ }
      }
    }
  }

  const css = await inlineFontFiles(cssChunks.join('\n'))
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<base href="${origin}/">
<style>${css}</style>
<style>
  /* Ensure the print-only DOM is visible inside the headless render
     even though our CSS keeps it hidden by default on screen. */
  html, body { background: #ffffff; margin: 0; padding: 0; }
  .screen-only { display: none !important; }
  .print-only { display: block !important; }
</style>
</head>
<body>
${rootEl.outerHTML}
</body>
</html>`
}

const CSS_URL_PATTERN = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g

function absolutizeCssUrls(css: string, baseHref: string): string {
  return css.replace(CSS_URL_PATTERN, (match, quote: string, rawPath: string) => {
    const path = rawPath.trim()
    // Leave data URIs, fragment refs (SVG gradients) and already absolute URLs alone.
    if (path.startsWith('data:') || path.startsWith('#') || /^[a-z][a-z\d+\-.]*:/i.test(path)) {
      return match
    }
    try {
      return `url(${quote}${new URL(path, baseHref).href}${quote})`
    } catch {
      return match
    }
  })
}

const FONT_URL_PATTERN = /url\((['"]?)([^'")]+\.woff2?)\1\)/g

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

// The server renders the HTML on about:blank, so web fonts fetched from our
// origin are cross-origin there and get blocked by CORS (images are not, which
// is why the logo always worked). Embedding the font files as data URIs makes
// the report use Inter instead of the server Chromium's fallback font.
async function inlineFontFiles(css: string): Promise<string> {
  const urls = new Set<string>()
  for (const match of css.matchAll(FONT_URL_PATTERN)) {
    const url = match[2]
    try {
      if (new URL(url).origin === window.location.origin) urls.add(url)
    } catch { /* not an absolute URL */ }
  }

  const dataUrls = new Map<string, string>()
  await Promise.all(Array.from(urls, async url => {
    try {
      const res = await fetch(url)
      if (!res.ok) return
      const blob = await res.blob()
      const type = url.endsWith('.woff') ? 'font/woff' : 'font/woff2'
      dataUrls.set(url, await blobToDataUrl(new Blob([blob], { type })))
    } catch { /* keep the original URL */ }
  }))

  return css.replace(FONT_URL_PATTERN, (match, quote: string, url: string) => {
    const dataUrl = dataUrls.get(url)
    return dataUrl ? `url(${quote}${dataUrl}${quote})` : match
  })
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Defer revoke so iOS Safari has time to register the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
