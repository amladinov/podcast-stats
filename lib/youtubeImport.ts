import type { PlayRecord, UploadedPlatform } from '@/types'
import { getPeriodFromPlays } from './platformPeriods'

interface YouTubeVideoApi {
  title: string
  videoId: string
  publishDate: string
  views: number
  likes: number
  comments: number
}

export interface YouTubeImportResult {
  plays: PlayRecord[]
  uploadedPlatform: UploadedPlatform
}

// Calls /api/youtube/videos using the short-lived cookie set by /api/youtube/callback,
// returns plays + UploadedPlatform descriptor ready to feed into uploadPlays().
export async function fetchYouTubeImport(): Promise<YouTubeImportResult> {
  const res = await fetch('/api/youtube/videos', { method: 'POST' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const data = await res.json()
  if (data.error) throw new Error(data.error)

  const videos = (data.videos ?? []) as YouTubeVideoApi[]

  const plays: PlayRecord[] = videos.map(v => ({
    episodeTitle: v.title,
    platform: 'youtube' as const,
    date: v.publishDate,
    plays: v.views,
    likes: v.likes,
    comments: v.comments,
  }))

  if (plays.length === 0) throw new Error('Не найдено видео на канале')

  const uploadedPlatform: UploadedPlatform = {
    platform: 'youtube',
    fileName: 'YouTube API',
    recordsCount: plays.length,
    uploadedAt: new Date().toISOString(),
    ...getPeriodFromPlays(plays),
  }

  return { plays, uploadedPlatform }
}
