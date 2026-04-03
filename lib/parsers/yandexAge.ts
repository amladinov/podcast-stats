import Papa from 'papaparse'

// Yandex age CSV (semicolon-separated, matrix format):
// "Возраст";"Не определен";"55-99";"45-54";"35-44";"25-34";"18-24";"0-17"
// "Не определен";12017;"";"";"";"";"";""
// "25-34";"";"";"";"";56696;"";""
// Value is on the diagonal: row label = column label

function parseRuInt(s: string): number {
  return parseInt((s || '0').replace(/\s/g, ''), 10) || 0
}

const AGE_ORDER = ['0-17', '18-24', '25-34', '35-44', '45-54', '55-99', 'Не определен']

export function parseYandexAge(csvText: string): Array<{ range: string; count: number }> {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    delimiter: ';',
    transformHeader: (h: string) => h.trim(),
  })

  const entries: Array<{ range: string; count: number }> = []

  for (const row of result.data as Record<string, string>[]) {
    const range = (row['Возраст'] || '').trim()
    if (!range) continue
    const count = parseRuInt(row[range])
    if (count > 0) entries.push({ range, count })
  }

  return entries.sort((a, b) => {
    const ia = AGE_ORDER.indexOf(a.range)
    const ib = AGE_ORDER.indexOf(b.range)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
}
