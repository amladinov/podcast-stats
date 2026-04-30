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
    try {
      const rules = sheet.cssRules
      let chunk = ''
      for (const rule of Array.from(rules)) {
        chunk += rule.cssText + '\n'
      }
      cssChunks.push(chunk)
    } catch {
      if (sheet.href) {
        try {
          const r = await fetch(sheet.href)
          if (r.ok) cssChunks.push(await r.text())
        } catch { /* ignore unreachable sheet */ }
      }
    }
  }

  const css = cssChunks.join('\n')
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
