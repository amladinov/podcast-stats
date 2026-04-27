import type { RSSEpisode, PlayRecord, NormalizedEpisode } from '@/types'

const MIN_TITLE_MATCH_SCORE = 0.6
const AMBIGUOUS_MATCH_DELTA = 0.05

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[«»""''„"‹›]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // \p{L} includes Cyrillic, Latin, etc.
    .replace(/\s+/g, ' ')
    .trim()
}

type IndexedEpisode = {
  episode: RSSEpisode
  normalizedTitle: string
  tokens: Set<string>
  publishTimestamp: number
  order: number
}

type EpisodeIndex = {
  exactTitle: Map<string, IndexedEpisode[]>
  publishDate: Map<string, IndexedEpisode[]>
  tokenIndex: Map<string, IndexedEpisode[]>
  ordered: IndexedEpisode[]
}

type ScoredCandidate = {
  candidate: IndexedEpisode
  score: number
}

type YandexTitleVariant = {
  normalizedTitle: string
  tokens: Set<string>
  signature: string
}

type YandexMatchResult = {
  episode: RSSEpisode | null
  score: number
  signatures: string[]
  isAmbiguous: boolean
  resolvedByAnchor: boolean
}

function getTokens(normalized: string): Set<string> {
  return new Set(normalized.split(' ').filter(word => word.length > 3))
}

function getTokenSignature(tokens: Set<string>): string {
  return Array.from(tokens).sort().join('|')
}

function similarity(
  queryNormalized: string,
  queryTokens: Set<string>,
  candidate: IndexedEpisode
): number {
  if (queryNormalized === candidate.normalizedTitle) return 1

  // Check if one contains the other (partial match)
  if (
    queryNormalized.includes(candidate.normalizedTitle) ||
    candidate.normalizedTitle.includes(queryNormalized)
  ) {
    return 0.85
  }

  if (queryTokens.size === 0 || candidate.tokens.size === 0) return 0

  let overlap = 0
  for (const token of queryTokens) {
    if (candidate.tokens.has(token)) overlap++
  }

  return overlap / Math.max(queryTokens.size, candidate.tokens.size)
}

function toTimestamp(isoDate: string): number {
  const timestamp = new Date(isoDate).getTime()
  return Number.isNaN(timestamp) ? NaN : timestamp
}

function buildEpisodeIndex(episodes: RSSEpisode[]): EpisodeIndex {
  const exactTitle = new Map<string, IndexedEpisode[]>()
  const publishDate = new Map<string, IndexedEpisode[]>()
  const tokenIndex = new Map<string, IndexedEpisode[]>()
  const ordered = episodes.map((episode, order) => {
    const normalizedTitle = normalize(episode.title)
    const tokens = getTokens(normalizedTitle)
    const indexed: IndexedEpisode = {
      episode,
      normalizedTitle,
      tokens,
      publishTimestamp: toTimestamp(episode.publishDate),
      order,
    }

    const byTitle = exactTitle.get(normalizedTitle)
    if (byTitle) byTitle.push(indexed)
    else exactTitle.set(normalizedTitle, [indexed])

    const byDate = publishDate.get(episode.publishDate)
    if (byDate) byDate.push(indexed)
    else publishDate.set(episode.publishDate, [indexed])

    for (const token of tokens) {
      const bucket = tokenIndex.get(token)
      if (bucket) bucket.push(indexed)
      else tokenIndex.set(token, [indexed])
    }

    return indexed
  })

  return { exactTitle, publishDate, tokenIndex, ordered }
}

function getCandidatePool(index: EpisodeIndex, queryTokens: Set<string>): IndexedEpisode[] {
  const narrowed = new Map<string, IndexedEpisode>()
  for (const token of queryTokens) {
    for (const candidate of index.tokenIndex.get(token) ?? []) {
      narrowed.set(candidate.episode.guid, candidate)
    }
  }
  return narrowed.size > 0 ? Array.from(narrowed.values()) : index.ordered
}

function rankCandidates(
  index: EpisodeIndex,
  queryNormalized: string,
  queryTokens: Set<string>
): ScoredCandidate[] {
  const candidatePool = getCandidatePool(index, queryTokens)
  return candidatePool
    .map(candidate => ({
      candidate,
      score: similarity(queryNormalized, queryTokens, candidate),
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => (b.score - a.score) || (a.candidate.order - b.candidate.order))
}

function buildYandexTitleVariants(title: string): YandexTitleVariant[] {
  const rawVariants = [title]
  rawVariants.push(
    ...title
      .split(/[:/]/g)
      .map(part => part.trim())
      .filter(Boolean)
  )

  const variants: YandexTitleVariant[] = []
  const seenNormalized = new Set<string>()

  for (const raw of rawVariants) {
    const normalizedTitle = normalize(raw)
    if (!normalizedTitle || seenNormalized.has(normalizedTitle)) continue
    seenNormalized.add(normalizedTitle)

    const tokens = getTokens(normalizedTitle)
    variants.push({
      normalizedTitle,
      tokens,
      signature: getTokenSignature(tokens),
    })
  }

  return variants
}

function findYandexEpisode(
  index: EpisodeIndex,
  title: string,
  anchorsBySignature: Map<string, string>
): YandexMatchResult {
  const variants = buildYandexTitleVariants(title)
  if (variants.length === 0) {
    return {
      episode: null,
      score: 0,
      signatures: [],
      isAmbiguous: false,
      resolvedByAnchor: false,
    }
  }

  const candidateScores = new Map<string, ScoredCandidate>()
  for (const variant of variants) {
    const ranked = rankCandidates(index, variant.normalizedTitle, variant.tokens)
    for (const scored of ranked) {
      const guid = scored.candidate.episode.guid
      const existing = candidateScores.get(guid)
      if (!existing || scored.score > existing.score) {
        candidateScores.set(guid, scored)
      }
    }
  }

  const ranked = Array.from(candidateScores.values())
    .sort((a, b) => (b.score - a.score) || (a.candidate.order - b.candidate.order))

  if (ranked.length === 0) {
    return {
      episode: null,
      score: 0,
      signatures: variants.map(variant => variant.signature).filter(Boolean),
      isAmbiguous: false,
      resolvedByAnchor: false,
    }
  }

  const best = ranked[0]
  if (best.score < MIN_TITLE_MATCH_SCORE) {
    return {
      episode: null,
      score: best.score,
      signatures: variants.map(variant => variant.signature).filter(Boolean),
      isAmbiguous: false,
      resolvedByAnchor: false,
    }
  }

  const secondBest = ranked[1]
  const isAmbiguous =
    !!secondBest && (best.score - secondBest.score) <= AMBIGUOUS_MATCH_DELTA
  const signatures = variants.map(variant => variant.signature).filter(Boolean)

  if (!isAmbiguous) {
    return {
      episode: best.candidate.episode,
      score: best.score,
      signatures,
      isAmbiguous: false,
      resolvedByAnchor: false,
    }
  }

  for (const signature of signatures) {
    const anchoredGuid = anchorsBySignature.get(signature)
    if (!anchoredGuid) continue

    const anchoredCandidate = candidateScores.get(anchoredGuid)
    if (anchoredCandidate) {
      return {
        episode: anchoredCandidate.candidate.episode,
        score: anchoredCandidate.score,
        signatures,
        isAmbiguous: true,
        resolvedByAnchor: true,
      }
    }

    const anchoredEpisode = index.ordered.find(item => item.episode.guid === anchoredGuid)
    if (anchoredEpisode) {
      return {
        episode: anchoredEpisode.episode,
        score: best.score,
        signatures,
        isAmbiguous: true,
        resolvedByAnchor: true,
      }
    }
  }

  return {
    episode: best.candidate.episode,
    score: best.score,
    signatures,
    isAmbiguous: true,
    resolvedByAnchor: false,
  }
}

function chooseBestCandidate(
  candidates: IndexedEpisode[],
  targetTimestamp?: number
): IndexedEpisode | null {
  if (candidates.length === 0) return null
  if (targetTimestamp === undefined || Number.isNaN(targetTimestamp)) return candidates[0]

  const exact = candidates.find(candidate => candidate.publishTimestamp === targetTimestamp)
  if (exact) return exact

  let best: IndexedEpisode | null = null
  let minDiff = Infinity

  for (const candidate of candidates) {
    if (Number.isNaN(candidate.publishTimestamp)) continue
    const diff = Math.abs(candidate.publishTimestamp - targetTimestamp)
    const days = diff / (1000 * 60 * 60 * 24)
    if (days <= 2 && diff < minDiff) {
      minDiff = diff
      best = candidate
    }
  }

  return best ?? candidates[0]
}

function findEpisodeByTitle(
  index: EpisodeIndex,
  title: string,
  isoDate?: string
): RSSEpisode | null {
  const normalizedTitle = normalize(title)
  if (!normalizedTitle) return null

  const targetTimestamp = isoDate ? toTimestamp(isoDate) : undefined
  const exactMatches = index.exactTitle.get(normalizedTitle)
  if (exactMatches?.length) {
    return chooseBestCandidate(exactMatches, targetTimestamp)?.episode ?? null
  }

  const queryTokens = getTokens(normalizedTitle)
  const candidatePool = getCandidatePool(index, queryTokens)
  let best: IndexedEpisode | null = null
  let bestScore = MIN_TITLE_MATCH_SCORE // minimum threshold

  for (const candidate of candidatePool) {
    const score = similarity(normalizedTitle, queryTokens, candidate)
    if (score > bestScore) {
      bestScore = score
      best = candidate
      continue
    }

    if (
      best &&
      score === bestScore &&
      targetTimestamp !== undefined &&
      !Number.isNaN(targetTimestamp)
    ) {
      const currentDiff = Number.isNaN(candidate.publishTimestamp)
        ? Infinity
        : Math.abs(candidate.publishTimestamp - targetTimestamp)
      const bestDiff = Number.isNaN(best.publishTimestamp)
        ? Infinity
        : Math.abs(best.publishTimestamp - targetTimestamp)

      if (currentDiff < bestDiff) {
        best = candidate
      }
    }
  }

  return best?.episode ?? null
}

function findEpisodeByDate(index: EpisodeIndex, date: string): RSSEpisode | null {
  // date is DD.MM.YYYY — convert to YYYY-MM-DD
  const parts = date.split('.')
  if (parts.length !== 3) return null
  const iso = `${parts[2]}-${parts[1]}-${parts[0]}`

  return findEpisodeByISODate(index, iso)
}

function findEpisodeByISODate(index: EpisodeIndex, isoDate: string): RSSEpisode | null {
  const exact = index.publishDate.get(isoDate)
  if (exact?.length) return exact[0].episode

  const target = toTimestamp(isoDate)
  if (Number.isNaN(target)) return null

  let closest: IndexedEpisode | null = null
  let minDiff = Infinity

  for (const candidate of index.ordered) {
    if (Number.isNaN(candidate.publishTimestamp)) continue
    const diff = Math.abs(candidate.publishTimestamp - target)
    const days = diff / (1000 * 60 * 60 * 24)
    if (days <= 2 && diff < minDiff) {
      minDiff = diff
      closest = candidate
    }
  }

  return closest?.episode ?? null
}

export function normalizePodcastData(
  episodes: RSSEpisode[],
  plays: PlayRecord[]
): NormalizedEpisode[] {
  const index = buildEpisodeIndex(episodes)
  const yandexAnchorsBySignature = new Map<string, string>()
  const yandexCompletionAccumulators = new Map<string, { weightedSum: number; weight: number }>()
  // Build map keyed by episode guid
  const map = new Map<string, NormalizedEpisode>()

  for (const indexed of index.ordered) {
    const { episode } = indexed
    map.set(episode.guid, {
      id: episode.guid,
      title: episode.title,
      publishDate: episode.publishDate,
      plays: { mave: 0, yandex: 0, spotify: 0, vk: 0, youtube: 0, total: 0 },
      timeline: [],
      maveVideoViews: undefined,
    })
  }

  for (const record of plays) {
    let episode: RSSEpisode | null = null
    let yandexMatch: YandexMatchResult | null = null

    if (record.platform === 'vk') {
      // VK has no title — match by date
      episode = findEpisodeByDate(index, record.date)
    } else if (record.platform === 'yandex') {
      yandexMatch = findYandexEpisode(index, record.episodeTitle, yandexAnchorsBySignature)
      episode = yandexMatch.episode
    } else if (record.platform === 'youtube') {
      // YouTube: try title first, fallback to date ±2 days
      episode = findEpisodeByTitle(index, record.episodeTitle, record.date)
      if (!episode && record.date) {
        episode = findEpisodeByISODate(index, record.date)
      }
    } else {
      episode = findEpisodeByTitle(index, record.episodeTitle)
    }

    if (!episode) continue
    const norm = map.get(episode.guid)
    if (!norm) continue

    if (record.platform === 'yandex' && yandexMatch) {
      const canAnchor =
        yandexMatch.score >= MIN_TITLE_MATCH_SCORE &&
        (!yandexMatch.isAmbiguous || yandexMatch.resolvedByAnchor)
      if (canAnchor) {
        for (const signature of yandexMatch.signatures) {
          yandexAnchorsBySignature.set(signature, episode.guid)
        }
      }
    }

    if (record.platform === 'mave') {
      if (record.sourceKind === 'paste') {
        norm.plays.mave = record.plays
        norm.maveVideoViews = record.videoViews
      } else {
        // Mave CSV provides per-day records — accumulate into timeline.
        norm.plays.mave += record.plays
        norm.timeline.push({ date: record.date, plays: record.plays })
      }
    } else if (record.platform === 'yandex') {
      norm.plays.yandex += record.plays
      norm.yandexStarts = (norm.yandexStarts ?? 0) + record.plays
      norm.yandexListeners = (norm.yandexListeners ?? 0) + (record.listeners ?? 0)
      norm.yandexHours = (norm.yandexHours ?? 0) + (record.streams ?? 0) // Яндекс "Стримы" → reuse streams field

      if (record.completionRate !== undefined && record.plays > 0) {
        const completion = yandexCompletionAccumulators.get(episode.guid) ?? {
          weightedSum: 0,
          weight: 0,
        }
        completion.weightedSum += record.completionRate * record.plays
        completion.weight += record.plays
        yandexCompletionAccumulators.set(episode.guid, completion)
        norm.yandexCompletionRate = completion.weightedSum / completion.weight
      }
    } else if (record.platform === 'spotify') {
      norm.plays.spotify = record.plays
      norm.spotifyStreams = record.streams
      norm.spotifyAudience = record.listeners
    } else if (record.platform === 'vk') {
      norm.plays.vk += record.plays
    } else if (record.platform === 'youtube') {
      norm.plays.youtube = record.plays
      norm.youtubeViews = record.plays
      norm.youtubeLikes = record.likes
      norm.youtubeComments = record.comments
    }
  }

  // Recalculate totals and sort timeline
  for (const norm of map.values()) {
    norm.plays.total =
      norm.plays.mave + norm.plays.yandex + norm.plays.spotify + norm.plays.vk + norm.plays.youtube
    norm.timeline.sort((a, b) => a.date.localeCompare(b.date))
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
  )
}
