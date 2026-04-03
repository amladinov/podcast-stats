import type { NormalizedEpisode, PlayRecord, Platform, UploadedPlatform } from '@/types'

const RU_MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

function normalizeDate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  const ruDate = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (ruDate) {
    return `${ruDate[3]}-${ruDate[2]}-${ruDate[1]}`
  }

  return null
}

export function getPeriodFromPlays(plays: PlayRecord[]): Pick<UploadedPlatform, 'periodStart' | 'periodEnd'> {
  const dates = plays
    .map(play => normalizeDate(play.date))
    .filter((date): date is string => Boolean(date))
    .sort((a, b) => a.localeCompare(b))

  if (dates.length === 0) return {}

  return {
    periodStart: dates[0],
    periodEnd: dates[dates.length - 1],
  }
}

function formatSingleDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return `${day} ${RU_MONTHS[month - 1]} ${year}`
}

export function formatPeriod(periodStart?: string, periodEnd?: string): string | null {
  if (!periodStart || !periodEnd) return null
  if (periodStart === periodEnd) return formatSingleDate(periodStart)
  return `${formatSingleDate(periodStart)} — ${formatSingleDate(periodEnd)}`
}

export function formatCompactPeriod(periodStart?: string, periodEnd?: string): string | null {
  if (!periodStart || !periodEnd) return null

  const [startYear, startMonth] = periodStart.split('-').map(Number)
  const [endYear, endMonth] = periodEnd.split('-').map(Number)

  if (startYear === endYear && startMonth === endMonth) {
    return `${RU_MONTHS[startMonth - 1]} ${startYear}`
  }

  if (startYear === endYear) {
    return `${RU_MONTHS[startMonth - 1]} — ${RU_MONTHS[endMonth - 1]} ${startYear}`
  }

  return `${RU_MONTHS[startMonth - 1]} ${startYear} — ${RU_MONTHS[endMonth - 1]} ${endYear}`
}

export function getEpisodeRangeFromNormalized(
  episodes: NormalizedEpisode[],
  platform: Platform
): Pick<UploadedPlatform, 'periodStart' | 'periodEnd'> {
  const dates = episodes
    .filter(ep => ep.plays[platform] > 0)
    .map(ep => ep.publishDate)
    .sort((a, b) => a.localeCompare(b))

  if (dates.length === 0) return {}

  return {
    periodStart: dates[0],
    periodEnd: dates[dates.length - 1],
  }
}

export function periodsDiffer(platforms: UploadedPlatform[]): boolean {
  const defined = platforms.filter(platform => platform.periodStart && platform.periodEnd)
  if (defined.length < 2) return false

  const [{ periodStart, periodEnd }] = defined
  return defined.some(platform => platform.periodStart !== periodStart || platform.periodEnd !== periodEnd)
}
