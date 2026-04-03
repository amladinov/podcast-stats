import type { NormalizedEpisode, Platform, PlayRecord } from '@/types'

type PlatformTotals = Record<Platform, number>

export function getPlatformTotals(
  episodes: NormalizedEpisode[],
  rawPlays: PlayRecord[]
): PlatformTotals {
  const rawTotals: PlatformTotals = {
    mave: 0,
    yandex: 0,
    spotify: 0,
    vk: 0,
    youtube: 0,
  }

  for (const record of rawPlays) {
    rawTotals[record.platform] += record.plays
  }

  if (rawPlays.length > 0) {
    return {
      mave: rawTotals.mave > 0 ? rawTotals.mave : sumEpisodePlays(episodes, 'mave'),
      yandex: rawTotals.yandex > 0 ? rawTotals.yandex : sumEpisodePlays(episodes, 'yandex'),
      spotify: rawTotals.spotify > 0 ? rawTotals.spotify : sumEpisodePlays(episodes, 'spotify'),
      vk: rawTotals.vk > 0 ? rawTotals.vk : sumEpisodePlays(episodes, 'vk'),
      youtube: rawTotals.youtube > 0 ? rawTotals.youtube : sumEpisodePlays(episodes, 'youtube'),
    }
  }

  return {
    mave: sumEpisodePlays(episodes, 'mave'),
    yandex: sumEpisodePlays(episodes, 'yandex'),
    spotify: sumEpisodePlays(episodes, 'spotify'),
    vk: sumEpisodePlays(episodes, 'vk'),
    youtube: sumEpisodePlays(episodes, 'youtube'),
  }
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
