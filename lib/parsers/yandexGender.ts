import Papa from 'papaparse'

// Yandex gender CSV (semicolon-separated, matrix format):
// "Пол";"Женщины";"Мужчины";"Не определен"
// "Женщины";61590;"";""
// "Мужчины";"";59323;""
// "Не определен";"";"";17193
// Value is on the diagonal: row label = column label

function parseRuInt(s: string): number {
  return parseInt((s || '0').replace(/\s/g, ''), 10) || 0
}

export function parseYandexGender(csvText: string): { female: number; male: number; unknown: number } {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    delimiter: ';',
    transformHeader: (h: string) => h.trim(),
  })

  let female = 0, male = 0, unknown = 0

  for (const row of result.data as Record<string, string>[]) {
    const label = (row['Пол'] || '').trim()
    if (label === 'Женщины') female = parseRuInt(row['Женщины'])
    else if (label === 'Мужчины') male = parseRuInt(row['Мужчины'])
    else if (label === 'Не определен') unknown = parseRuInt(row['Не определен'])
  }

  return { female, male, unknown }
}
