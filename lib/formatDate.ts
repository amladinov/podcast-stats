/** «5 июн. 24 г.» — короткая дата для таблиц и списков */
export function formatShortDate(date: string | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('ru', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  })
}

/** «13 октября 2026 г.» — дата экспорта в печатном отчёте */
export function formatExportDate(): string {
  return new Date().toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
