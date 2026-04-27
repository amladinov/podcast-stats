import type { PlayRecord } from '@/types'
import { parseRuFloat, parseRuInt, parseYandexCsv } from './yandexCommon'

// Yandex CSV (semicolon-separated):
// Ранг;Эпизод;Старты;Слушатели;Стримы;Часы;Средний процент прослушивания, %;Процент дослушиваемости, %
// Decimal separator is comma (52,9)

export function parseYandex(csvText: string): PlayRecord[] {
  return parseYandexCsv(csvText)
    .filter(row => row['Эпизод'])
    .map(row => ({
      episodeTitle: row['Эпизод'].trim(),
      platform: 'yandex' as const,
      date: '', // Yandex has no dates — all-time aggregated
      plays: parseRuInt(row['Старты']),
      streams: parseRuInt(row['Стримы']),
      listeners: parseRuInt(row['Слушатели']),
      completionRate: parseRuFloat(row['Процент дослушиваемости, %']),
    }))
}
