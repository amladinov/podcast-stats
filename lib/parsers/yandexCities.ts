import Papa from 'papaparse'
import type { YandexAudience } from '@/types'

// Yandex cities CSV (semicolon-separated):
// "Ранг";"Город";"Старты";"Стримы";"Авторизованные слушатели";"Часы";"Средний процент прослушивания, %";"Процент дослушиваемости, %"
// 1;"Москва";78418;42408;27072;15633;55.9;34.62

type YandexCity = NonNullable<YandexAudience['cities']>[number]

function parseRuFloat(s: string): number {
  return parseFloat((s || '0').replace(',', '.')) || 0
}

function parseRuInt(s: string): number {
  return parseInt((s || '0').replace(/\s/g, ''), 10) || 0
}

export function parseYandexCities(csvText: string): YandexCity[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    delimiter: ';',
    transformHeader: (h: string) => h.trim(),
  })

  return (result.data as Record<string, string>[])
    .filter(row => row['Город'])
    .slice(0, 50)
    .map(row => ({
      rank: parseRuInt(row['Ранг']),
      city: row['Город'].trim(),
      starts: parseRuInt(row['Старты']),
      streams: parseRuInt(row['Стримы']),
      listeners: parseRuInt(row['Авторизованные слушатели']),
      hours: parseRuInt(row['Часы']),
      avgListening: parseRuFloat(row['Средний процент прослушивания, %']),
      completion: parseRuFloat(row['Процент дослушиваемости, %']),
    }))
}
