export interface RSSEpisode {
  guid: string
  title: string
  publishDate: string // ISO date YYYY-MM-DD
  duration?: number
  description?: string
  imageUrl?: string
}

export interface RSSPodcast {
  title: string
  description?: string
  imageUrl?: string
  episodes: RSSEpisode[]
}

export type Platform = 'mave' | 'yandex' | 'spotify' | 'vk' | 'youtube'
export type MaveSourceKind = 'csv' | 'paste'

// Raw play record after parsing any CSV or API import
export interface PlayRecord {
  episodeTitle: string
  platform: Platform
  date: string // YYYY-MM-DD — publication date OR play date (Mave)
  plays: number
  sourceKind?: MaveSourceKind
  videoViews?: number
  // Extra metrics when available
  streams?: number
  listeners?: number
  completionRate?: number
  likes?: number
  comments?: number
}

// Episode with all data merged across platforms
export interface NormalizedEpisode {
  id: string         // RSS guid or generated
  title: string
  publishDate: string
  plays: {
    mave: number
    yandex: number
    spotify: number
    vk: number
    youtube: number
    total: number
  }
  // Daily timeline from Mave (only Mave provides this)
  timeline: Array<{ date: string; plays: number }>
  maveVideoViews?: number
  // Extra Yandex metrics
  yandexStarts?: number
  yandexListeners?: number
  yandexHours?: number
  yandexCompletionRate?: number
  // Extra Spotify metrics
  spotifyStreams?: number
  spotifyAudience?: number
  // Extra YouTube metrics
  youtubeViews?: number
  youtubeLikes?: number
  youtubeComments?: number
}

export interface UploadedPlatform {
  platform: Platform
  fileName: string
  recordsCount: number
  uploadedAt: string
  sourceKind?: MaveSourceKind | 'api'
  timelineSourceKind?: 'csv'
  periodStart?: string
  periodEnd?: string
}

export interface YandexAudience {
  gender?: { female: number; male: number; unknown: number }
  age?: Array<{ range: string; count: number }>
  cities?: Array<{
    rank: number; city: string; starts: number; streams: number
    listeners: number; hours: number; avgListening: number; completion: number
  }>
}

export interface Podcast {
  id: string
  rssUrl: string
  title: string
  description?: string
  imageUrl?: string
  episodes: RSSEpisode[]
  rawPlays: PlayRecord[]
  normalized: NormalizedEpisode[]
  uploadedPlatforms: UploadedPlatform[]
  yandexAudience?: YandexAudience
  createdAt: string
}

export interface MavePasteEpisode {
  seasonLabel?: string
  episodeNumber?: number
  publishDate: string
  title: string
  durationLabel?: string
  plays: number
  videoViews: number
}
