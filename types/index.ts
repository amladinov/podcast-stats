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

// Raw play record after parsing any CSV
export interface PlayRecord {
  episodeTitle: string
  platform: 'mave' | 'yandex' | 'spotify' | 'vk'
  date: string // YYYY-MM-DD — publication date OR play date (Mave)
  plays: number
  // Extra metrics when available
  streams?: number
  listeners?: number
  completionRate?: number
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
    total: number
  }
  // Daily timeline from Mave (only Mave provides this)
  timeline: Array<{ date: string; plays: number }>
  // Extra Yandex metrics
  yandexStarts?: number
  yandexListeners?: number
  yandexHours?: number
  yandexCompletionRate?: number
  // Extra Spotify metrics
  spotifyStreams?: number
  spotifyAudience?: number
}

export interface UploadedPlatform {
  platform: 'mave' | 'yandex' | 'spotify' | 'vk'
  fileName: string
  recordsCount: number
  uploadedAt: string
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
  createdAt: string
}
