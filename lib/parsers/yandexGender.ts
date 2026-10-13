import { parseRuInt, parseYandexCsv } from './yandexCommon'

// Yandex gender CSV. Two formats are supported:
//
// Old matrix format (value on the diagonal: row label === column label):
//   "Пол";"Женщины";"Мужчины";"Не определен"
//   "Женщины";61590;"";""
//   "Мужчины";"";59323;""
//
// New 2026 format (value in a dedicated column, filled only on the diagonal row;
// the trailing "Пол" duplicate header is renamed to "Пол_1" by the CSV parser):
//   "Пол";"Авторизованные слушатели";"Пол"
//   "Женщины";527480;"Женщины"
//   "Мужчины";"";"Женщины"
//   "Мужчины";459211;"Мужчины"

export function parseYandexGender(csvText: string): { female: number; male: number; unknown: number } {
  let female = 0, male = 0, unknown = 0

  for (const row of parseYandexCsv(csvText)) {
    const label = (row['Пол'] || '').trim()
    const isNewFormat = 'Авторизованные слушатели' in row
    const value = isNewFormat ? parseRuInt(row['Авторизованные слушатели']) : parseRuInt(row[label])
    if (value <= 0) continue

    if (label === 'Женщины') female = value
    else if (label === 'Мужчины') male = value
    else if (label === 'Не определен') unknown = value
  }

  return { female, male, unknown }
}
