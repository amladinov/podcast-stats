import Papa from 'papaparse'
import type { PlayRecord } from '@/types'

// VK CSV (semicolon-separated, header row):
// Раздел;Подраздел;Дата;Время;Эпизод;Добавили в избранное;Прослушивания;Поделились
// Column positions (0-indexed): Дата=2, Время=3, Эпизод=4, Добавили в избранное=5
//
// IMPORTANT: Despite header label, "Добавили в избранное" (col 5) = actual plays
// "Прослушивания" (col 6) = something else (always 0 or shares)
// Verified by comparing CSV values with VK website

function parseRuInt(s: string): number {
  return parseInt((s || '0').replace(/\s/g, ''), 10) || 0
}

export function parseVK(csvText: string): PlayRecord[] {
  // Parse without header to handle encoding issues gracefully
  const result = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
    delimiter: ';',
  })

  const rows = result.data
  if (rows.length < 2) return []

  // Detect column indices from header row
  const headers = rows[0].map(h => h.trim().replace(/^\uFEFF/, '')) // strip BOM if present
  const hasGeneralExportSignature =
    headers.some(h => h.includes('Вид данных')) &&
    headers.some(h => h.includes('Сортировка: гранулярность')) &&
    headers.some(h => h.includes('Значение'))

  const hasGeneralExportRows = rows
    .slice(1, Math.min(rows.length, 20))
    .some(row => row?.[0]?.trim() === 'Подкасты' && row?.[1]?.trim() === 'Общее')

  if (hasGeneralExportSignature || hasGeneralExportRows) {
    throw new Error(
      'Этот CSV ВК формата «Подкасты / Общее» не поддерживается. Выгрузи эпизодную статистику из раздела «Подкасты → Эпизоды».'
    )
  }

  const dateIdx = headers.findIndex(h => h.includes('Дата') || h.toLowerCase().includes('date'))
  const playsIdx = headers.findIndex(h => h.includes('избранное') || h.toLowerCase().includes('favorite'))

  // Fallback to known positions if header parsing fails (encoding issue)
  const dateCol = dateIdx >= 0 ? dateIdx : 2
  const playsCol = playsIdx >= 0 ? playsIdx : 5

  const records: PlayRecord[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length <= playsCol) continue

    const date = row[dateCol]?.trim()
    const plays = parseRuInt(row[playsCol])

    if (!date || plays === 0) continue

    records.push({
      episodeTitle: '',
      platform: 'vk',
      date,
      plays,
    })
  }

  return records
}
