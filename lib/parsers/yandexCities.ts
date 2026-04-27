import type { YandexAudience } from '@/types'
import { parseRuFloat, parseRuInt, parseYandexCsv } from './yandexCommon'

// Yandex cities CSV (semicolon-separated):
// "Ранг";"Город";"Старты";"Стримы";"Авторизованные слушатели";"Часы";"Средний процент прослушивания, %";"Процент дослушиваемости, %"
// 1;"Москва";78418;42408;27072;15633;55.9;34.62

type YandexCity = NonNullable<YandexAudience['cities']>[number]

export function parseYandexCities(csvText: string): YandexCity[] {
  return parseYandexCsv(csvText)
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
