'use client'

import { useRef, useState } from 'react'
import { exportDashboardToPdf, isMobileViewport } from '@/lib/pdfExport'

function sanitizePrintTitle(title: string): string {
  const sanitized = title
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return sanitized || 'Podcast Stats'
}

function formatPrintTimestamp(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}_${hours}-${minutes}`
}

/**
 * Экспорт дашборда в PDF: на мобильных через серверный Chromium,
 * на десктопе через системную печать браузера.
 */
export function useDashboardPdfExport(podcastTitle: string) {
  const printRootRef = useRef<HTMLDivElement | null>(null)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  const handlePrintPdf = async () => {
    if (typeof window === 'undefined') return

    const printTitle = `${sanitizePrintTitle(podcastTitle)}_${formatPrintTimestamp()}`

    // Mobile (incl. Arc and other WKWebView wrappers) — generate PDF in JS
    // because window.print() is unreliable there.
    if (isMobileViewport()) {
      const root = printRootRef.current
      if (!root) {
        setPdfError('Не нашли блок для экспорта')
        return
      }

      setPdfGenerating(true)
      setPdfError(null)
      try {
        await exportDashboardToPdf(root, { filename: printTitle })
      } catch (e) {
        setPdfError(e instanceof Error ? e.message : 'Не удалось собрать PDF')
      } finally {
        setPdfGenerating(false)
      }
      return
    }

    // Desktop — native browser print preserves crisp typography and respects
    // the existing @media print stylesheet.
    const originalTitle = document.title
    let restored = false

    const restoreTitle = () => {
      if (restored) return
      restored = true
      document.title = originalTitle
      window.removeEventListener('afterprint', restoreTitle)
    }

    document.title = printTitle
    window.addEventListener('afterprint', restoreTitle, { once: true })
    window.setTimeout(restoreTitle, 1500)
    window.print()
  }

  return { printRootRef, pdfGenerating, pdfError, handlePrintPdf }
}
