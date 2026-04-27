import type { NormalizedEpisode, Platform, PlayRecord } from '@/types'

type PlatformTotals = Record<Platform, number>

export function getPlatformTotals(
  episodes: NormalizedEpisode[],
  rawPlays: PlayRecord[],
  enabledPlatforms?: Set<Platform>
): PlatformTotals {
  const hasMaveSnapshot = rawPlays.some(record => record.platform === 'mave' && record.sourceKind === 'paste')
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

  let totals: PlatformTotals

  if (rawPlays.length > 0) {
    totals = {
      mave: hasMaveSnapshot ? sumEpisodePlays(episodes, 'mave') : (rawTotals.mave > 0 ? rawTotals.mave : sumEpisodePlays(episodes, 'mave')),
      yandex: rawTotals.yandex > 0 ? rawTotals.yandex : sumEpisodePlays(episodes, 'yandex'),
      spotify: rawTotals.spotify > 0 ? rawTotals.spotify : sumEpisodePlays(episodes, 'spotify'),
      vk: rawTotals.vk > 0 ? rawTotals.vk : sumEpisodePlays(episodes, 'vk'),
      youtube: rawTotals.youtube > 0 ? rawTotals.youtube : sumEpisodePlays(episodes, 'youtube'),
    }
  } else {
    totals = {
      mave: sumEpisodePlays(episodes, 'mave'),
      yandex: sumEpisodePlays(episodes, 'yandex'),
      spotify: sumEpisodePlays(episodes, 'spotify'),
      vk: sumEpisodePlays(episodes, 'vk'),
      youtube: sumEpisodePlays(episodes, 'youtube'),
    }
  }

  if (!enabledPlatforms) {
    return totals
  }

  return {
    mave: enabledPlatforms.has('mave') ? totals.mave : 0,
    yandex: enabledPlatforms.has('yandex') ? totals.yandex : 0,
    spotify: enabledPlatforms.has('spotify') ? totals.spotify : 0,
    vk: enabledPlatforms.has('vk') ? totals.vk : 0,
    youtube: enabledPlatforms.has('youtube') ? totals.youtube : 0,
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

export function getFilteredEpisodes(
  episodes: NormalizedEpisode[],
  enabledPlatforms: Set<Platform>
): NormalizedEpisode[] {
  return episodes.map(episode => {
    const mave = enabledPlatforms.has('mave') ? episode.plays.mave : 0
    const yandex = enabledPlatforms.has('yandex') ? episode.plays.yandex : 0
    const spotify = enabledPlatforms.has('spotify') ? episode.plays.spotify : 0
    const vk = enabledPlatforms.has('vk') ? episode.plays.vk : 0
    const youtube = enabledPlatforms.has('youtube') ? episode.plays.youtube : 0

    return {
      ...episode,
      plays: {
        ...episode.plays,
        mave,
        yandex,
        spotify,
        vk,
        youtube,
        total: mave + yandex + spotify + vk + youtube,
      },
      timeline: enabledPlatforms.has('mave') ? [...episode.timeline] : [],
    }
  })
}
