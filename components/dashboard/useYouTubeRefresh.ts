'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReadonlyURLSearchParams } from 'next/navigation'
import { fetchYouTubeImport } from '@/lib/youtubeImport'
import type { PlayRecord, UploadedPlatform } from '@/types'

export type RefreshMessage = { type: 'success' | 'error'; text: string } | null

interface Params {
  podcastId: string
  searchParams: ReadonlyURLSearchParams
  uploadPlays: (podcastId: string, plays: PlayRecord[], platform: UploadedPlatform) => void
  /** Пока панель YouTube видна, страница перерисовывается раз в минуту ради «обновлено N минут назад». */
  active: boolean
}

/** Обработка возврата из Google OAuth (?youtube=success|error) и импорт видео. */
export function useYouTubeRefresh({ podcastId, searchParams, uploadPlays, active }: Params) {
  const [youtubeRefreshing, setYoutubeRefreshing] = useState(false)
  const [youtubeMessage, setYoutubeMessage] = useState<RefreshMessage>(null)
  const [, setNowTick] = useState(0)
  const youtubeCallbackHandledRef = useRef(false)

  // Re-render every 60s so "N minutes ago" stays fresh.
  useEffect(() => {
    if (!active) return
    const interval = window.setInterval(() => setNowTick(t => t + 1), 60_000)
    return () => window.clearInterval(interval)
  }, [active])

  // Handle YouTube OAuth callback (?youtube=success|error&reason=...)
  // Runs once per mount thanks to youtubeCallbackHandledRef guard. State updates
  // are deferred to a microtask: this is a one-shot navigation event, not a
  // render-time derivation, so it must not run synchronously inside the effect.
  useEffect(() => {
    const status = searchParams.get('youtube')
    if (!status || youtubeCallbackHandledRef.current) return
    youtubeCallbackHandledRef.current = true

    // Strip query params from URL without re-triggering the effect.
    window.history.replaceState({}, '', `/${podcastId}/dashboard`)
    const reason = searchParams.get('reason') || 'unknown'

    queueMicrotask(() => {
      if (status === 'error') {
        setYoutubeMessage({ type: 'error', text: `Не удалось обновить YouTube: ${reason}` })
        return
      }

      if (status === 'success') {
        setYoutubeRefreshing(true)
        setYoutubeMessage(null)

        fetchYouTubeImport()
          .then(({ plays, uploadedPlatform }) => {
            uploadPlays(podcastId, plays, uploadedPlatform)
            setYoutubeMessage({ type: 'success', text: `Обновлено ${plays.length} видео` })
          })
          .catch(e => {
            const text = e instanceof Error ? e.message : 'Ошибка импорта YouTube'
            setYoutubeMessage({ type: 'error', text })
          })
          .finally(() => setYoutubeRefreshing(false))
      }
    })
  }, [searchParams, podcastId, uploadPlays])

  return { youtubeRefreshing, youtubeMessage }
}
