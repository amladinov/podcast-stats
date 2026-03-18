import type { RSSEpisode, PlayRecord, NormalizedEpisode } from '@/types'

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[«»""''„"‹›]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // \p{L} includes Cyrillic, Latin, etc.
    .replace(/\s+/g, ' ')
    .trim()
}

function similarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return 1

  // Check if one contains the other (partial match)
  if (na.includes(nb) || nb.includes(na)) return 0.85

  // Word overlap
  const wordsA = new Set(na.split(' ').filter(w => w.length > 3))
  const wordsB = new Set(nb.split(' ').filter(w => w.length > 3))
  if (wordsA.size === 0 || wordsB.size === 0) return 0

  let overlap = 0
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++
  }
  return overlap / Math.max(wordsA.size, wordsB.size)
}

function findEpisodeByTitle(episodes: RSSEpisode[], title: string): RSSEpisode | null {
  let best: RSSEpisode | null = null
  let bestScore = 0.6 // minimum threshold

  for (const ep of episodes) {
    const score = similarity(ep.title, title)
    if (score > bestScore) {
      bestScore = score
      best = ep
    }
  }
  return best
}

function findEpisodeByDate(episodes: RSSEpisode[], date: string): RSSEpisode | null {
  // date is DD.MM.YYYY — convert to YYYY-MM-DD
  const parts = date.split('.')
  if (parts.length !== 3) return null
  const iso = `${parts[2]}-${parts[1]}-${parts[0]}`

  // Exact match first
  const exact = episodes.find(ep => ep.publishDate === iso)
  if (exact) return exact

  // Within ±2 days
  const target = new Date(iso).getTime()
  let closest: RSSEpisode | null = null
  let minDiff = Infinity

  for (const ep of episodes) {
    const diff = Math.abs(new Date(ep.publishDate).getTime() - target)
    const days = diff / (1000 * 60 * 60 * 24)
    if (days <= 2 && diff < minDiff) {
      minDiff = diff
      closest = ep
    }
  }
  return closest
}

export function normalizePodcastData(
  episodes: RSSEpisode[],
  plays: PlayRecord[]
): NormalizedEpisode[] {
  // Build map keyed by episode guid
  const map = new Map<string, NormalizedEpisode>()

  for (const ep of episodes) {
    map.set(ep.guid, {
      id: ep.guid,
      title: ep.title,
      publishDate: ep.publishDate,
      plays: { mave: 0, yandex: 0, spotify: 0, vk: 0, total: 0 },
      timeline: [],
    })
  }

  for (const record of plays) {
    let episode: RSSEpisode | null = null

    if (record.platform === 'vk') {
      // VK has no title — match by date
      episode = findEpisodeByDate(episodes, record.date)
    } else {
      episode = findEpisodeByTitle(episodes, record.episodeTitle)
    }

    if (!episode) continue
    const norm = map.get(episode.guid)
    if (!norm) continue

    if (record.platform === 'mave') {
      // Mave provides per-day records — accumulate into timeline
      norm.plays.mave += record.plays
      norm.timeline.push({ date: record.date, plays: record.plays })
    } else if (record.platform === 'yandex') {
      norm.plays.yandex = record.plays // total starts
      norm.yandexStarts = record.plays
      norm.yandexListeners = record.listeners
      norm.yandexHours = record.streams // Яндекс "Стримы" → reuse streams field
      norm.yandexCompletionRate = record.completionRate
    } else if (record.platform === 'spotify') {
      norm.plays.spotify = record.plays
      norm.spotifyStreams = record.streams
      norm.spotifyAudience = record.listeners
    } else if (record.platform === 'vk') {
      norm.plays.vk += record.plays
    }
  }

  // Recalculate totals and sort timeline
  for (const norm of map.values()) {
    norm.plays.total =
      norm.plays.mave + norm.plays.yandex + norm.plays.spotify + norm.plays.vk
    norm.timeline.sort((a, b) => a.date.localeCompare(b.date))
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
  )
}
