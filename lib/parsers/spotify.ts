import Papa from 'papaparse'
import type { PlayRecord } from '@/types'

// Spotify CSV: name,plays,streams,audience_size,releaseDate
// releaseDate is already ISO YYYY-MM-DD

export function parseSpotify(csvText: string): PlayRecord[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  })

  return (result.data as Record<string, string>[])
    .filter(row => row.name && row.releaseDate)
    .map((row: Record<string, string>) => ({
      episodeTitle: row.name.trim(),
      platform: 'spotify' as const,
      date: row.releaseDate.trim(),
      plays: parseInt(row.plays || '0', 10) || 0,
      streams: parseInt(row.streams || '0', 10) || 0,
      listeners: parseInt(row.audience_size || '0', 10) || 0,
    }))
}
