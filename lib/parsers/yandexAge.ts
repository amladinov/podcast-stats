import { parseRuInt, parseYandexCsv } from './yandexCommon'

// Yandex age CSV. Two formats are supported:
//
// Old matrix format (value on the diagonal: row label === column label):
//   "Возраст";"Не определен";"55-99";"45-54";"35-44";"25-34";"18-24";"0-17"
//   "Не определен";12017;"";"";"";"";"";""
//   "25-34";"";"";"";"";56696;"";""
//
// New 2026 format (value in a dedicated column, filled only on the diagonal row;
// the trailing "Возраст" duplicate header is renamed to "Возраст_1" by the CSV parser):
//   "Возраст";"Авторизованные слушатели";"Возраст"
//   "Не определен";139878;"Не определен"
//   "25-34";463387;"25-34"

const AGE_ORDER = ['0-17', '18-24', '25-34', '35-44', '45-54', '55-99', 'Не определен']

export function parseYandexAge(csvText: string): Array<{ range: string; count: number }> {
  const entries: Array<{ range: string; count: number }> = []

  for (const row of parseYandexCsv(csvText)) {
    const range = (row['Возраст'] || '').trim()
    if (!range) continue
    const isNewFormat = 'Авторизованные слушатели' in row
    const count = isNewFormat ? parseRuInt(row['Авторизованные слушатели']) : parseRuInt(row[range])
    if (count > 0) entries.push({ range, count })
  }

  return entries.sort((a, b) => {
    const ia = AGE_ORDER.indexOf(a.range)
    const ib = AGE_ORDER.indexOf(b.range)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
}
