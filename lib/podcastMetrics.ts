import type { NormalizedEpisode, Platform, PlayRecord } from '@/types'
import { PLATFORM_KEYS, emptyPlatformTotals } from '@/lib/platforms'

type PlatformTotals = Record<Platform, number>

export function getPlatformTotals(
  episodes: NormalizedEpisode[],
  rawPlays: PlayRecord[],
  enabledPlatforms?: Set<Platform>
): PlatformTotals {
  const hasMaveSnapshot = rawPlays.some(record => record.platform === 'mave' && record.sourceKind === 'paste')
  const rawTotals = emptyPlatformTotals()

  for (const record of rawPlays) {
    rawTotals[record.platform] += record.plays
  }

  const totals = emptyPlatformTotals()

  for (const platform of PLATFORM_KEYS) {
    // Mave paste snapshot is already folded into normalized episodes; raw rows would double count.
    const useRaw = rawPlays.length > 0 && rawTotals[platform] > 0 && !(platform === 'mave' && hasMaveSnapshot)
    totals[platform] = useRaw ? rawTotals[platform] : sumEpisodePlays(episodes, platform)
  }

  if (!enabledPlatforms) {
    return totals
  }

  for (const platform of PLATFORM_KEYS) {
    if (!enabledPlatforms.has(platform)) totals[platform] = 0
  }

  return totals
}

function sumEpisodePlays(episodes: NormalizedEpisode[], platform: Platform): number {
  let total = 0
  for (const episode of episodes) {
    total += episode.plays[platform]
  }
  return total
}

export function getTotalPlays(episodes: NormalizedEpisode[]): number {
  let total = 0
  for (const episode of episodes) {
    total += episode.plays.total
  }
  return total
}

export function getFilteredEpisodes(
  episodes: NormalizedEpisode[],
  enabledPlatforms: Set<Platform>
): NormalizedEpisode[] {
  return episodes.map(episode => {
    const plays = { ...episode.plays }
    let total = 0

    for (const platform of PLATFORM_KEYS) {
      plays[platform] = enabledPlatforms.has(platform) ? episode.plays[platform] : 0
      total += plays[platform]
    }

    return {
      ...episode,
      plays: { ...plays, total },
      timeline: enabledPlatforms.has('mave') ? [...episode.timeline] : [],
    }
  })
}
