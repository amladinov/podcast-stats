import Papa from 'papaparse'
import type { PlayRecord } from '@/types'

// VK Video CSV (semicolon-separated, header row):
// Раздел;Подраздел;Дата;Время;Описание;Охват;Просмотры;Лайки;Комментарии;Поделились
// Date format: DD.MM.YYYY → ISO YYYY-MM-DD
// Numbers may use space as thousands separator (e.g. "1 715")
// Match by "Описание" (title); use "Просмотры" as plays.

function parseRuInt(s: string): number {
  return parseInt((s || '0').replace(/\s/g, ''), 10) || 0
}

function ruDateToISO(s: string): string {
  const m = (s || '').trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!m) return ''
  return `${m[3]}-${m[2]}-${m[1]}`
}

export function parseVKVideo(csvText: string): PlayRecord[] {
  const result = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
    delimiter: ';',
  })

  const rows = result.data
  if (rows.length < 2) return []

  const headers = rows[0].map(h => h.trim().replace(/^﻿/, ''))

  const sectionIdx = headers.findIndex(h => h.includes('Раздел') && !h.includes('Подраздел'))
  const dateIdx = headers.findIndex(h => h.includes('Дата'))
  const titleIdx = headers.findIndex(h => h.includes('Описание'))
  const viewsIdx = headers.findIndex(h => h.includes('Просмотры'))

  const sectionCol = sectionIdx >= 0 ? sectionIdx : 0
  const dateCol = dateIdx >= 0 ? dateIdx : 2
  const titleCol = titleIdx >= 0 ? titleIdx : 4
  const viewsCol = viewsIdx >= 0 ? viewsIdx : 6

  const records: PlayRecord[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length <= viewsCol) continue

    const section = (row[sectionCol] || '').trim()
    if (section && section !== 'Видео') continue

    const title = (row[titleCol] || '').trim()
    const date = ruDateToISO(row[dateCol] || '')
    const plays = parseRuInt(row[viewsCol])

    if (!title || !date || plays === 0) continue

    records.push({
      episodeTitle: title,
      platform: 'vkvideo',
      date,
      plays,
    })
  }

  return records
}
