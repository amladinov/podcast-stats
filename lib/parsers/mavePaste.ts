import type { MavePasteEpisode, PlayRecord } from '@/types'

type ParseWarning = {
  index: number
  reason: string
}

export interface MavePasteParseResult {
  episodes: MavePasteEpisode[]
  playRecords: PlayRecord[]
  warnings: ParseWarning[]
}

const MONTHS: Record<string, string> = {
  янв: '01',
  фев: '02',
  февр: '02',
  мар: '03',
  апр: '04',
  мая: '05',
  май: '05',
  июн: '06',
  июл: '07',
  авг: '08',
  сент: '09',
  сен: '09',
  окт: '10',
  нояб: '11',
  ноя: '11',
  дек: '12',
}

const EPISODE_LINE = /^(\d+)\s+выпуск$/i
const SEASON_LINE = /^(\d+)\s+сезон$/i
const NO_SEASON_LINE = /^без сезона$/i
const DURATION_LINE = /^\d{1,2}:\d{2}(?::\d{2})?$/
const VIDEO_RELEASE_LINE = /^видеовыпуск$/i
const NUMBER_LINE = /^\d[\d ]*$/

function normalizeMonth(month: string): string | null {
  return MONTHS[month.toLowerCase().replace(/\.$/, '')] ?? null
}

function parseRuDate(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2})\s+([а-яё]+)\.?\s+(\d{4})$/i)
  if (!match) return null

  const month = normalizeMonth(match[2])
  if (!month) return null

  return `${match[3]}-${month}-${match[1].padStart(2, '0')}`
}

function parseInteger(value: string): number {
  return Number.parseInt(value.replace(/\s/g, ''), 10)
}

function toPlayRecord(episode: MavePasteEpisode): PlayRecord {
  return {
    episodeTitle: episode.title,
    platform: 'mave',
    date: episode.publishDate,
    plays: episode.plays,
    sourceKind: 'paste',
    videoViews: episode.videoViews,
  }
}

export function parseMavePaste(text: string): MavePasteParseResult {
  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  const episodes: MavePasteEpisode[] = []
  const warnings: ParseWarning[] = []
  let currentSeason: string | undefined
  let index = 0

  while (index < lines.length) {
    const line = lines[index]

    if (SEASON_LINE.test(line) || NO_SEASON_LINE.test(line)) {
      currentSeason = line
      index += 1
      continue
    }

    const episodeMatch = line.match(EPISODE_LINE)
    const maybeDate = parseRuDate(line)

    let episodeNumber: number | undefined
    let dateLine: string | null = null
    const titleLines: string[] = []

    if (episodeMatch) {
      episodeNumber = Number.parseInt(episodeMatch[1], 10)
      dateLine = lines[index + 1] ?? null
      index += 2
    } else if (maybeDate) {
      dateLine = line
      index += 1
    } else {
      warnings.push({ index, reason: `Неожиданная строка: ${line}` })
      index += 1
      continue
    }

    const publishDate = dateLine ? parseRuDate(dateLine) : null
    if (!publishDate) {
      warnings.push({ index, reason: `Не удалось распознать дату: ${dateLine ?? '—'}` })
      continue
    }

    while (index < lines.length && !DURATION_LINE.test(lines[index])) {
      if (SEASON_LINE.test(lines[index]) || NO_SEASON_LINE.test(lines[index]) || EPISODE_LINE.test(lines[index])) {
        break
      }
      titleLines.push(lines[index])
      index += 1
    }

    const durationLabel = lines[index]
    if (!durationLabel || !DURATION_LINE.test(durationLabel)) {
      warnings.push({ index, reason: `Не удалось распознать блок выпуска на дате ${dateLine}` })
      continue
    }

    index += 1

    if (VIDEO_RELEASE_LINE.test(lines[index] ?? '')) {
      index += 1
    }

    const playsLine = lines[index]
    const videoViewsLine = lines[index + 1]

    if (!playsLine || !NUMBER_LINE.test(playsLine) || !videoViewsLine || !NUMBER_LINE.test(videoViewsLine)) {
      warnings.push({ index, reason: `Не удалось распознать блок выпуска на дате ${dateLine}` })
      continue
    }

    const title = titleLines.join(' ').replace(/\s+/g, ' ').trim()
    if (!title) {
      warnings.push({ index, reason: `Пустой заголовок у выпуска на дате ${dateLine}` })
      index += 3
      continue
    }

    episodes.push({
      seasonLabel: currentSeason,
      episodeNumber,
      publishDate,
      title,
      durationLabel,
      plays: parseInteger(playsLine),
      videoViews: parseInteger(videoViewsLine),
    })

    index += 2
  }

  return {
    episodes,
    playRecords: episodes.map(toPlayRecord),
    warnings,
  }
}
