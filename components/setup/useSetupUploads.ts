'use client'

import { useCallback, useState } from 'react'
import type { PlayRecord, UploadedPlatform } from '@/types'
import { getPeriodFromPlays } from '@/lib/platformPeriods'
import { parsePlatform, type CsvPlatform } from './platformGuides'

interface Params {
  podcastId: string
  uploadPlays: (podcastId: string, plays: PlayRecord[], platform: UploadedPlatform) => void
}

/** Загрузка CSV по платформам: статусы, ошибки, счётчики распознанных записей. */
export function useSetupUploads({ podcastId, uploadPlays }: Params) {
  const [uploading, setUploading] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [previews, setPreviews] = useState<Record<string, number>>({})
  const [lastUploadedKey, setLastUploadedKey] = useState<string | null>(null)

  const handleFile = useCallback(async (platform: CsvPlatform, file: File) => {
    setUploading(platform)
    setLastUploadedKey(null)
    setErrors(prev => ({ ...prev, [platform]: '' }))
    try {
      const text = await file.text()
      const plays = parsePlatform(platform, text)
      if (plays.length === 0) throw new Error('Не удалось распознать данные в файле')
      uploadPlays(podcastId, plays, {
        platform,
        fileName: file.name,
        recordsCount: plays.length,
        uploadedAt: new Date().toISOString(),
        sourceKind: platform === 'mave' ? 'csv' : undefined,
        timelineSourceKind: platform === 'mave' ? 'csv' : undefined,
        ...getPeriodFromPlays(plays),
      })
      setPreviews(prev => ({ ...prev, [platform]: plays.length }))
      setLastUploadedKey(platform)
    } catch (e) {
      setErrors(prev => ({ ...prev, [platform]: e instanceof Error ? e.message : 'Ошибка' }))
    } finally {
      setUploading(null)
    }
  }, [podcastId, uploadPlays])

  return {
    uploading,
    setUploading,
    errors,
    setErrors,
    previews,
    setPreviews,
    lastUploadedKey,
    setLastUploadedKey,
    handleFile,
  }
}
