'use client'

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { ReadonlyURLSearchParams } from 'next/navigation'
import type { PlayRecord, UploadedPlatform } from '@/types'
import { fetchYouTubeImport } from '@/lib/youtubeImport'

interface Params {
  podcastId: string
  searchParams: ReadonlyURLSearchParams
  uploadPlays: (podcastId: string, plays: PlayRecord[], platform: UploadedPlatform) => void
  setErrors: Dispatch<SetStateAction<Record<string, string>>>
  setPreviews: Dispatch<SetStateAction<Record<string, number>>>
  setLastUploadedKey: Dispatch<SetStateAction<string | null>>
}

/** Возврат из Google OAuth на экране мастера (?youtube=success|error): импорт видео в статусы карточки. */
export function useYouTubeSetupCallback({ podcastId, searchParams, uploadPlays, setErrors, setPreviews, setLastUploadedKey }: Params) {
  const [youtubeLoading, setYoutubeLoading] = useState(false)
  const ytImportDone = useRef(false)

  // One-shot navigation event; state updates are deferred to a microtask so they
  // don't run synchronously inside the effect body.
  useEffect(() => {
    const ytStatus = searchParams.get('youtube')
    if (!ytStatus || ytImportDone.current) return
    ytImportDone.current = true

    // Clean URL params
    window.history.replaceState({}, '', `/${podcastId}/setup`)
    const reason = searchParams.get('reason') || 'unknown'

    queueMicrotask(() => {
      if (ytStatus === 'error') {
        setErrors(prev => ({ ...prev, youtube: `Ошибка подключения YouTube: ${reason}` }))
        return
      }

      if (ytStatus === 'success') {
        setYoutubeLoading(true)
        setErrors(prev => ({ ...prev, youtube: '' }))

        fetchYouTubeImport()
          .then(({ plays, uploadedPlatform }) => {
            uploadPlays(podcastId, plays, uploadedPlatform)
            setPreviews(prev => ({ ...prev, youtube: plays.length }))
            setLastUploadedKey('youtube')
          })
          .catch(e => {
            setErrors(prev => ({ ...prev, youtube: e instanceof Error ? e.message : 'Ошибка импорта YouTube' }))
          })
          .finally(() => setYoutubeLoading(false))
      }
    })
  }, [searchParams, podcastId, uploadPlays, setErrors, setPreviews, setLastUploadedKey])

  return { youtubeLoading }
}
