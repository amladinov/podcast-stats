'use client'

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import type { MavePasteEpisode, PlayRecord, Podcast, RSSEpisode, UploadedPlatform } from '@/types'
import { parseMavePaste } from '@/lib/parsers/mavePaste'
import { fetchRssEpisodes } from '@/lib/podcastRss'

function getTodayISODate(): string {
  return new Date().toISOString().slice(0, 10)
}

interface Params {
  podcastId: string
  podcast: Podcast | undefined
  uploadPlays: (podcastId: string, plays: PlayRecord[], platform: UploadedPlatform) => void
  refreshEpisodes: (podcastId: string, fresh: RSSEpisode[]) => { added: number; total: number }
  setUploading: Dispatch<SetStateAction<string | null>>
  setPreviews: Dispatch<SetStateAction<Record<string, number>>>
  setLastUploadedKey: Dispatch<SetStateAction<string | null>>
}

/** Альтернативный импорт Mave: вставка текста со страницы выпусков, превью и импорт. */
export function useMavePaste({ podcastId, podcast, uploadPlays, refreshEpisodes, setUploading, setPreviews, setLastUploadedKey }: Params) {
  const [mavePasteText, setMavePasteText] = useState('')
  const [mavePastePreview, setMavePastePreview] = useState<MavePasteEpisode[]>([])
  const [mavePasteWarnings, setMavePasteWarnings] = useState<string[]>([])
  const [mavePasteError, setMavePasteError] = useState('')
  const [maveTutorialOpen, setMaveTutorialOpen] = useState(false)
  const [isMaveAlternativeOpen, setIsMaveAlternativeOpen] = useState(false)

  // Как только пользователь что-то вставил, секция «Альтернатива» раскрывается сама.
  useEffect(() => {
    if (
      mavePasteText.trim() ||
      mavePastePreview.length > 0 ||
      mavePasteWarnings.length > 0 ||
      mavePasteError
    ) {
      setIsMaveAlternativeOpen(true)
    }
  }, [mavePasteError, mavePastePreview.length, mavePasteText, mavePasteWarnings.length])

  const handleTextChange = useCallback((value: string) => {
    setMavePasteText(value)
    setMavePastePreview([])
    setMavePasteWarnings([])
    setMavePasteError(prev => (prev ? '' : prev))
  }, [])

  const handleMavePastePreview = useCallback(() => {
    setMavePasteError('')

    const result = parseMavePaste(mavePasteText)
    if (result.episodes.length === 0) {
      setMavePastePreview([])
      setMavePasteWarnings([])
      setMavePasteError('Не удалось распознать ни одного выпуска. Вставь текст со страницы выпусков Mave.')
      return
    }

    setMavePastePreview(result.episodes)
    setMavePasteWarnings(result.warnings.map(item => item.reason))
  }, [mavePasteText])

  const handleMavePasteImport = useCallback(async () => {
    if (mavePastePreview.length === 0) return

    const playRecords: PlayRecord[] = mavePastePreview.map(episode => ({
      episodeTitle: episode.title,
      platform: 'mave',
      date: episode.publishDate,
      plays: episode.plays,
      sourceKind: 'paste',
      videoViews: episode.videoViews,
    }))

    const existingMave = podcast?.uploadedPlatforms.find(platform => platform.platform === 'mave')
    const hasCsvTimeline = existingMave?.sourceKind === 'csv' || existingMave?.timelineSourceKind === 'csv'
    const dates = mavePastePreview.map(episode => episode.publishDate).sort((a, b) => a.localeCompare(b))

    setUploading('mave')
    try {
      // Refresh the RSS skeleton first so episodes published after the podcast was added exist
      // before we attach plays — otherwise new episodes get silently dropped by the matcher.
      const rssUrl = podcast?.rssUrl
      if (rssUrl && rssUrl !== 'https://demo') {
        try {
          const fresh = await fetchRssEpisodes(rssUrl)
          if (fresh.length > 0) refreshEpisodes(podcastId, fresh)
        } catch {
          // RSS unavailable — proceed with the existing skeleton, don't block the import.
        }
      }

      uploadPlays(podcastId, playRecords, {
        platform: 'mave',
        fileName: 'Mave Paste Snapshot',
        recordsCount: playRecords.length,
        uploadedAt: new Date().toISOString(),
        sourceKind: 'paste',
        timelineSourceKind: hasCsvTimeline ? 'csv' : undefined,
        periodStart: dates[0],
        periodEnd: getTodayISODate(),
      })

      setPreviews(prev => ({ ...prev, mave: playRecords.length }))
      setLastUploadedKey('mave')
      setMavePasteWarnings([])
    } finally {
      setUploading(null)
    }
  }, [mavePastePreview, podcast?.uploadedPlatforms, podcast?.rssUrl, podcastId, uploadPlays, refreshEpisodes, setUploading, setPreviews, setLastUploadedKey])

  return {
    mavePasteText,
    mavePastePreview,
    mavePasteWarnings,
    mavePasteError,
    maveTutorialOpen,
    setMaveTutorialOpen,
    isMaveAlternativeOpen,
    setIsMaveAlternativeOpen,
    handleTextChange,
    handleMavePastePreview,
    handleMavePasteImport,
  }
}
