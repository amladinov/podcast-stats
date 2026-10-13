import type { RSSEpisode, NormalizedEpisode } from '@/types'
import { normalizePodcastData, episodeMatchKey } from './matcher'

// RSS feeds without <guid> fall back to positional ids (ep-0, ep-1, ...) in app/api/rss/route.ts.
// Those shift when new episodes are prepended, so they must never be used to carry over data.
const INDEX_GUID = /^ep-\d+$/

export interface EpisodeRefreshInput {
  episodes: RSSEpisode[]
  normalized: NormalizedEpisode[]
}

export interface EpisodeRefreshResult {
  episodes: RSSEpisode[]
  normalized: NormalizedEpisode[]
  added: number
}

/**
 * Merge a freshly fetched RSS feed into the existing skeleton without losing accumulated
 * platform data. Platform stats live in `normalized` (rawPlays is not persisted), so we carry
 * them over by title+date (guid as fallback) and keep `normalized.id === episodes.guid`.
 */
export function applyEpisodeRefresh(
  current: EpisodeRefreshInput,
  fresh: RSSEpisode[]
): EpisodeRefreshResult {
  // Never wipe the skeleton with an empty/broken feed.
  if (fresh.length === 0) {
    return { episodes: current.episodes, normalized: current.normalized, added: 0 }
  }

  // Skeleton: fresh episodes + stale ones that vanished from the feed (keep their data).
  const freshGuids = new Set(fresh.map(e => e.guid))
  const stale = current.episodes.filter(e => !freshGuids.has(e.guid))
  const episodes = [...fresh, ...stale]

  // Canonical empty slots (id = guid, all plays 0, sorted by date desc). Reused instead of
  // hand-building NormalizedEpisode so we never forget an optional field.
  const blank = normalizePodcastData(episodes, [])

  // Index existing data: by title+date (primary, survives guid changes), by id/guid (fallback).
  const byKey = new Map<string, NormalizedEpisode>()
  const byGuid = new Map<string, NormalizedEpisode>()
  for (const n of current.normalized) {
    byGuid.set(n.id, n)
    const key = episodeMatchKey(n.title, n.publishDate)
    if (!byKey.has(key)) byKey.set(key, n)
  }

  const usedOldIds = new Set<string>()
  const normalized = blank.map(slot => {
    let prev = byKey.get(episodeMatchKey(slot.title, slot.publishDate))
    if (prev && usedOldIds.has(prev.id)) prev = undefined // title+date collision already consumed

    if (!prev && !INDEX_GUID.test(slot.id)) {
      const guidMatch = byGuid.get(slot.id) // covers a renamed title when guid is stable
      if (guidMatch && !usedOldIds.has(guidMatch.id)) prev = guidMatch
    }

    if (!prev) return slot // genuinely new episode — stays empty

    usedOldIds.add(prev.id)
    // Carry data, but id/title/date come from the fresh skeleton (keeps id === guid invariant).
    return { ...prev, id: slot.id, title: slot.title, publishDate: slot.publishDate }
  })

  // Count new episodes by title+date — guid may be positional and shift.
  const oldKeys = new Set(current.normalized.map(n => episodeMatchKey(n.title, n.publishDate)))
  const added = fresh.filter(e => !oldKeys.has(episodeMatchKey(e.title, e.publishDate))).length

  return { episodes, normalized, added }
}
