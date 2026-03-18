import Papa from 'papaparse'
import type { PlayRecord } from '@/types'

// Yandex CSV (semicolon-separated):
// Ранг;Эпизод;Старты;Слушатели;Стримы;Часы;Средний процент прослушивания, %;Процент дослушиваемости, %
// Decimal separator is comma (52,9)

function parseRuFloat(s: string): number {
  return parseFloat((s || '0').replace(',', '.')) || 0
}

function parseRuInt(s: string): number {
  return parseInt((s || '0').replace(/\s/g, ''), 10) || 0
}

export function parseYandex(csvText: string): PlayRecord[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    delimiter: ';',
    transformHeader: (h: string) => h.trim(),
  })

  return (result.data as Record<string, string>[])
    .filter(row => row['Эпизод'])
    .map((row: Record<string, string>) => ({
      episodeTitle: row['Эпизод'].trim(),
      platform: 'yandex' as const,
      date: '', // Yandex has no dates — all-time aggregated
      plays: parseRuInt(row['Старты']),
      streams: parseRuInt(row['Стримы']),
      listeners: parseRuInt(row['Слушатели']),
      completionRate: parseRuFloat(row['Процент дослушиваемости, %']),
    }))
}
