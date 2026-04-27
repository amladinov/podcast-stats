import Papa from 'papaparse'

export function parseRuFloat(s: string): number {
  return parseFloat((s || '0').replace(',', '.')) || 0
}

export function parseRuInt(s: string): number {
  return parseInt((s || '0').replace(/\s/g, ''), 10) || 0
}

export function parseYandexCsv(csvText: string): Record<string, string>[] {
  const cleaned = csvText.replace(/^﻿/, '')
  const result = Papa.parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: true,
    delimiter: ';',
    transformHeader: (h: string) => h.trim().replace(/^﻿/, ''),
  })
  return result.data as Record<string, string>[]
}
