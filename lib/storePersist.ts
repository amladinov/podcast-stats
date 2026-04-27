import type { Podcast, RSSEpisode, NormalizedEpisode, UploadedPlatform, YandexAudience } from '@/types'
import { DEMO_IDS } from './demoData'

const STORAGE_VERSION = 2
const DAY_MS = 24 * 60 * 60 * 1000

type PersistedTimelinePointV2 = [number, number]
type PersistedTimelineV2 = [string, PersistedTimelinePointV2[]]
type PersistedPlaysV2 = [number, number, number, number, number, number]
type PersistedGenderV2 = [number, number, number]
type PersistedAgeRowV2 = [string, number]
type PersistedCityRowV2 = [number, string, number, number, number, number, number, number]

export interface PersistedStoreV2 {
  podcasts: PersistedPodcastV2[]
}

export interface PersistedPodcastV2 {
  i: string
  r: string
  t: string
  d?: string
  m?: string
  e: PersistedRSSEpisodeV2[]
  n: PersistedNormalizedEpisodeV2[]
  u: PersistedUploadedPlatformV2[]
  y?: PersistedYandexAudienceV2
  c: string
}

interface PersistedRSSEpisodeV2 {
  g: string
  t: string
  p: string
  u?: number
  d?: string
  i?: string
}

interface PersistedNormalizedEpisodeV2 {
  i: string
  t: string
  d: string
  p: PersistedPlaysV2
  l?: PersistedTimelineV2
  mv?: number
  ys?: number
  yl?: number
  yh?: number
  yc?: number
  ss?: number
  sa?: number
  yv?: number
  yk?: number
  ym?: number
}

interface PersistedUploadedPlatformV2 {
  p: UploadedPlatform['platform']
  f: string
  r: number
  u: string
  s?: UploadedPlatform['sourceKind']
  t?: UploadedPlatform['timelineSourceKind']
  a?: string
  b?: string
}

interface PersistedYandexAudienceV2 {
  g?: PersistedGenderV2
  a?: PersistedAgeRowV2[]
  c?: PersistedCityRowV2[]
}

interface LegacyPersistedStore {
  podcasts?: Podcast[]
}

function daysBetween(baseDate: string, nextDate: string): number {
  const base = new Date(`${baseDate}T00:00:00Z`).getTime()
  const next = new Date(`${nextDate}T00:00:00Z`).getTime()
  if (Number.isNaN(base) || Number.isNaN(next)) return 0
  return Math.round((next - base) / DAY_MS)
}

function addDays(baseDate: string, offsetDays: number): string {
  const base = new Date(`${baseDate}T00:00:00Z`)
  if (Number.isNaN(base.getTime())) return baseDate
  base.setUTCDate(base.getUTCDate() + offsetDays)
  return base.toISOString().slice(0, 10)
}

function serializeTimeline(timeline: NormalizedEpisode['timeline']): PersistedTimelineV2 | undefined {
  if (!timeline.length) return undefined

  const sorted = [...timeline].sort((a, b) => a.date.localeCompare(b.date))
  const baseDate = sorted[0].date

  return [
    baseDate,
    sorted.map(point => [daysBetween(baseDate, point.date), point.plays]),
  ]
}

function deserializeTimeline(serialized?: PersistedTimelineV2): NormalizedEpisode['timeline'] {
  if (!serialized) return []

  const [baseDate, points] = serialized
  return points.map(([offsetDays, plays]) => ({
    date: addDays(baseDate, offsetDays),
    plays,
  }))
}

function serializeEpisodes(episodes: RSSEpisode[]): PersistedRSSEpisodeV2[] {
  return episodes.map(episode => ({
    g: episode.guid,
    t: episode.title,
    p: episode.publishDate,
    ...(episode.duration !== undefined ? { u: episode.duration } : {}),
    ...(episode.description ? { d: episode.description } : {}),
    ...(episode.imageUrl ? { i: episode.imageUrl } : {}),
  }))
}

function deserializeEpisodes(episodes: PersistedRSSEpisodeV2[]): RSSEpisode[] {
  return episodes.map(episode => ({
    guid: episode.g,
    title: episode.t,
    publishDate: episode.p,
    ...(episode.u !== undefined ? { duration: episode.u } : {}),
    ...(episode.d ? { description: episode.d } : {}),
    ...(episode.i ? { imageUrl: episode.i } : {}),
  }))
}

function serializeNormalized(normalized: NormalizedEpisode[]): PersistedNormalizedEpisodeV2[] {
  return normalized.map(episode => ({
    i: episode.id,
    t: episode.title,
    d: episode.publishDate,
    p: [
      episode.plays.mave,
      episode.plays.yandex,
      episode.plays.spotify,
      episode.plays.vk,
      episode.plays.youtube,
      episode.plays.total,
    ],
    ...(serializeTimeline(episode.timeline) ? { l: serializeTimeline(episode.timeline) } : {}),
    ...(episode.maveVideoViews !== undefined ? { mv: episode.maveVideoViews } : {}),
    ...(episode.yandexStarts !== undefined ? { ys: episode.yandexStarts } : {}),
    ...(episode.yandexListeners !== undefined ? { yl: episode.yandexListeners } : {}),
    ...(episode.yandexHours !== undefined ? { yh: episode.yandexHours } : {}),
    ...(episode.yandexCompletionRate !== undefined ? { yc: episode.yandexCompletionRate } : {}),
    ...(episode.spotifyStreams !== undefined ? { ss: episode.spotifyStreams } : {}),
    ...(episode.spotifyAudience !== undefined ? { sa: episode.spotifyAudience } : {}),
    ...(episode.youtubeViews !== undefined ? { yv: episode.youtubeViews } : {}),
    ...(episode.youtubeLikes !== undefined ? { yk: episode.youtubeLikes } : {}),
    ...(episode.youtubeComments !== undefined ? { ym: episode.youtubeComments } : {}),
  }))
}

function deserializeNormalized(normalized: PersistedNormalizedEpisodeV2[]): NormalizedEpisode[] {
  return normalized.map(episode => ({
    id: episode.i,
    title: episode.t,
    publishDate: episode.d,
    plays: {
      mave: episode.p[0] ?? 0,
      yandex: episode.p[1] ?? 0,
      spotify: episode.p[2] ?? 0,
      vk: episode.p[3] ?? 0,
      youtube: episode.p[4] ?? 0,
      total: episode.p[5] ?? 0,
    },
    timeline: deserializeTimeline(episode.l),
    ...(episode.mv !== undefined ? { maveVideoViews: episode.mv } : {}),
    ...(episode.ys !== undefined ? { yandexStarts: episode.ys } : {}),
    ...(episode.yl !== undefined ? { yandexListeners: episode.yl } : {}),
    ...(episode.yh !== undefined ? { yandexHours: episode.yh } : {}),
    ...(episode.yc !== undefined ? { yandexCompletionRate: episode.yc } : {}),
    ...(episode.ss !== undefined ? { spotifyStreams: episode.ss } : {}),
    ...(episode.sa !== undefined ? { spotifyAudience: episode.sa } : {}),
    ...(episode.yv !== undefined ? { youtubeViews: episode.yv } : {}),
    ...(episode.yk !== undefined ? { youtubeLikes: episode.yk } : {}),
    ...(episode.ym !== undefined ? { youtubeComments: episode.ym } : {}),
  }))
}

function serializeUploadedPlatforms(platforms: UploadedPlatform[]): PersistedUploadedPlatformV2[] {
  return platforms.map(platform => ({
    p: platform.platform,
    f: platform.fileName,
    r: platform.recordsCount,
    u: platform.uploadedAt,
    ...(platform.sourceKind ? { s: platform.sourceKind } : {}),
    ...(platform.timelineSourceKind ? { t: platform.timelineSourceKind } : {}),
    ...(platform.periodStart ? { a: platform.periodStart } : {}),
    ...(platform.periodEnd ? { b: platform.periodEnd } : {}),
  }))
}

function deserializeUploadedPlatforms(platforms: PersistedUploadedPlatformV2[]): UploadedPlatform[] {
  return platforms.map(platform => ({
    platform: platform.p,
    fileName: platform.f,
    recordsCount: platform.r,
    uploadedAt: platform.u,
    ...(platform.s ? { sourceKind: platform.s } : {}),
    ...(platform.t ? { timelineSourceKind: platform.t } : {}),
    ...(platform.a ? { periodStart: platform.a } : {}),
    ...(platform.b ? { periodEnd: platform.b } : {}),
  }))
}

function serializeYandexAudience(audience?: YandexAudience): PersistedYandexAudienceV2 | undefined {
  if (!audience) return undefined

  const serialized: PersistedYandexAudienceV2 = {}

  if (audience.gender) {
    serialized.g = [
      audience.gender.female,
      audience.gender.male,
      audience.gender.unknown,
    ]
  }

  if (audience.age?.length) {
    serialized.a = audience.age.map(item => [item.range, item.count])
  }

  if (audience.cities?.length) {
    serialized.c = audience.cities.map(item => [
      item.rank,
      item.city,
      item.starts,
      item.streams,
      item.listeners,
      item.hours,
      item.avgListening,
      item.completion,
    ])
  }

  return Object.keys(serialized).length > 0 ? serialized : undefined
}

function deserializeYandexAudience(audience?: PersistedYandexAudienceV2): YandexAudience | undefined {
  if (!audience) return undefined

  const runtime: YandexAudience = {}

  if (audience.g) {
    runtime.gender = {
      female: audience.g[0] ?? 0,
      male: audience.g[1] ?? 0,
      unknown: audience.g[2] ?? 0,
    }
  }

  if (audience.a) {
    runtime.age = audience.a.map(([range, count]) => ({ range, count }))
  }

  if (audience.c) {
    runtime.cities = audience.c.map(([rank, city, starts, streams, listeners, hours, avgListening, completion]) => ({
      rank,
      city,
      starts,
      streams,
      listeners,
      hours,
      avgListening,
      completion,
    }))
  }

  return Object.keys(runtime).length > 0 ? runtime : undefined
}

function serializePodcast(podcast: Podcast): PersistedPodcastV2 {
  return {
    i: podcast.id,
    r: podcast.rssUrl,
    t: podcast.title,
    ...(podcast.description ? { d: podcast.description } : {}),
    ...(podcast.imageUrl ? { m: podcast.imageUrl } : {}),
    e: serializeEpisodes(podcast.episodes),
    n: serializeNormalized(podcast.normalized),
    u: serializeUploadedPlatforms(podcast.uploadedPlatforms),
    ...(serializeYandexAudience(podcast.yandexAudience) ? { y: serializeYandexAudience(podcast.yandexAudience) } : {}),
    c: podcast.createdAt,
  }
}

function deserializePodcast(podcast: PersistedPodcastV2): Podcast {
  return {
    id: podcast.i,
    rssUrl: podcast.r,
    title: podcast.t,
    ...(podcast.d ? { description: podcast.d } : {}),
    ...(podcast.m ? { imageUrl: podcast.m } : {}),
    episodes: deserializeEpisodes(podcast.e),
    rawPlays: [],
    normalized: deserializeNormalized(podcast.n),
    uploadedPlatforms: deserializeUploadedPlatforms(podcast.u),
    ...(podcast.y ? { yandexAudience: deserializeYandexAudience(podcast.y) } : {}),
    createdAt: podcast.c,
  }
}

function isPersistedPodcastV2(value: unknown): value is PersistedPodcastV2 {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'i' in value &&
    'r' in value &&
    't' in value &&
    'e' in value &&
    'n' in value &&
    'u' in value &&
    'c' in value
  )
}

function isPersistedStoreV2(value: unknown): value is PersistedStoreV2 {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'podcasts' in value &&
    Array.isArray((value as PersistedStoreV2).podcasts) &&
    ((value as PersistedStoreV2).podcasts.length === 0 || isPersistedPodcastV2((value as PersistedStoreV2).podcasts[0]))
  )
}

function isLegacyPersistedStore(value: unknown): value is LegacyPersistedStore {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'podcasts' in value &&
    Array.isArray((value as LegacyPersistedStore).podcasts)
  )
}

export function serializeStoreForStorage(state: { podcasts: Podcast[] }): PersistedStoreV2 {
  return {
    podcasts: state.podcasts
      .filter(podcast => !DEMO_IDS.has(podcast.id))
      .map(serializePodcast),
  }
}

export function deserializeStoreFromStorage(raw: unknown): { podcasts: Podcast[] } {
  if (isPersistedStoreV2(raw)) {
    return {
      podcasts: raw.podcasts.map(deserializePodcast),
    }
  }

  if (isLegacyPersistedStore(raw)) {
    return {
      podcasts: (raw.podcasts ?? [])
        .filter((podcast): podcast is Podcast => Boolean(podcast))
        .filter(podcast => !DEMO_IDS.has(podcast.id))
        .map(podcast => ({
          ...podcast,
          rawPlays: [],
        })),
    }
  }

  return { podcasts: [] }
}

export function getStorageVersion() {
  return STORAGE_VERSION
}
