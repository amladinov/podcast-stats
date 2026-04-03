import Papa from 'papaparse'
import type { PlayRecord } from '@/types'

// Mave exports a pivot table:
// Row 1: "Выпуск", date1, date2, ... (DD.MM.YYYY, newest first)
// Row 2+: episodeTitle, plays_day1, plays_day2, ...
//
// The UI only renders Mave dynamics by month, so we aggregate daily cells into
// per-episode monthly records here. This keeps imports fast enough for large
// annual exports and avoids generating tens of thousands of client-side rows.

function ddmmyyyyToMonthISO(ddmmyyyy: string): string {
  const parts = ddmmyyyy.trim().split('.')
  if (parts.length !== 3) return ddmmyyyy
  return `${parts[2]}-${parts[1]}-01`
}

export function parseMave(csvText: string): PlayRecord[] {
  const result = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
  })

  const rows = result.data
  if (rows.length < 2) return []

  // First row: headers. Index 0 = "Выпуск", rest = dates
  const headerRow = rows[0]
  const months: string[] = headerRow.slice(1).map(d => ddmmyyyyToMonthISO(d.trim()))

  const recordsMap = new Map<string, PlayRecord>()

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length < 2) continue

    const episodeTitle = row[0].trim()
    if (!episodeTitle) continue

    for (let j = 1; j < row.length; j++) {
      const monthISO = months[j - 1]
      if (!monthISO) continue

      const raw = (row[j] || '0').toString().replace(/\s/g, '').replace(',', '.')
      const plays = parseInt(raw, 10)
      if (isNaN(plays) || plays === 0) continue

      const key = `${episodeTitle}\u0000${monthISO}`
      const existing = recordsMap.get(key)

      if (existing) {
        existing.plays += plays
        continue
      }

      recordsMap.set(key, {
        episodeTitle,
        platform: 'mave',
        date: monthISO,
        plays,
      })
    }
  }

  return Array.from(recordsMap.values())
}
