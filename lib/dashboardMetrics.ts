import type { NormalizedEpisode, Platform, PlayRecord, UploadedPlatform, YandexAudience } from '@/types'
import { PLATFORM_BY_KEY } from '@/lib/platforms'
import { formatCompactPeriod, getEpisodeRangeFromNormalized, getPeriodFromPlays } from '@/lib/platformPeriods'
import { AGE_COLORS, GENDER_COLORS } from '@/lib/chartColors'

export type EpisodeSortKey = 'total' | 'publishDate' | Platform

export interface PlatformCardMeta {
  label: string
  period?: string
  releases?: string
}

export interface ChartDatum {
  name: string
  value: number
  color: string
}

/** Сортировка эпизодов по итогу, дате публикации или прослушиваниям на платформе. */
export function sortEpisodes(
  episodes: NormalizedEpisode[],
  sortKey: EpisodeSortKey,
  desc: boolean
): NormalizedEpisode[] {
  return [...episodes].sort((a, b) => {
    if (sortKey === 'publishDate') {
      const av = new Date(a.publishDate).getTime()
      const bv = new Date(b.publishDate).getTime()
      return desc ? bv - av : av - bv
    }

    const av = a.plays[sortKey]
    const bv = b.plays[sortKey]
    return desc ? bv - av : av - bv
  })
}

/** Подписи периодов под карточками платформ: «апр 2023 — июн 2024». */
export function buildStatCardMeta(
  uploadedPlatforms: UploadedPlatform[],
  rawPlays: PlayRecord[],
  episodes: NormalizedEpisode[]
): Partial<Record<Platform, PlatformCardMeta>> {
  return Object.fromEntries(
    uploadedPlatforms.map(platform => {
      const fallback = getPeriodFromPlays(rawPlays.filter(play => play.platform === platform.platform))
      const period = formatCompactPeriod(platform.periodStart ?? fallback.periodStart, platform.periodEnd ?? fallback.periodEnd)
      const episodeRange = platform.platform === 'yandex'
        ? getEpisodeRangeFromNormalized(episodes, 'yandex')
        : {}
      const releases = platform.platform === 'yandex'
        ? formatCompactPeriod(episodeRange.periodStart, episodeRange.periodEnd)
        : null

      return [platform.platform, {
        label: PLATFORM_BY_KEY[platform.platform]?.label ?? platform.platform,
        period: period ?? undefined,
        releases: releases ?? undefined,
      }]
    })
  )
}

/** Данные для диаграмм пола и возраста (только ненулевые сегменты). */
export function buildAudienceChartData(audience: YandexAudience | null): { genderData: ChartDatum[]; ageData: ChartDatum[] } {
  const genderData = audience?.gender
    ? [
        { name: 'Женщины', value: audience.gender.female, color: GENDER_COLORS['Женщины'] },
        { name: 'Мужчины', value: audience.gender.male, color: GENDER_COLORS['Мужчины'] },
        ...(audience.gender.unknown > 0 ? [{ name: 'Не определён', value: audience.gender.unknown, color: GENDER_COLORS['Не определён'] }] : []),
      ].filter(item => item.value > 0)
    : []
  const ageData = audience?.age
    ? audience.age.map((item, index) => ({ name: item.range, value: item.count, color: AGE_COLORS[index % AGE_COLORS.length] })).filter(item => item.value > 0)
    : []

  return { genderData, ageData }
}
