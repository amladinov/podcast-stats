'use client'

import { useCallback, useState } from 'react'
import type { YandexAudience } from '@/types'
import { parseYandexGender } from '@/lib/parsers/yandexGender'
import { parseYandexAge } from '@/lib/parsers/yandexAge'
import { parseYandexCities } from '@/lib/parsers/yandexCities'

export type AudienceType = 'gender' | 'age' | 'cities'

interface Params {
  podcastId: string
  uploadYandexAudience: (podcastId: string, data: YandexAudience) => void
}

/** Загрузка CSV аудитории Яндекс Музыки: пол, возраст, города. */
export function useAudienceUpload({ podcastId, uploadYandexAudience }: Params) {
  const [audienceUploading, setAudienceUploading] = useState<string | null>(null)
  const [audienceErrors, setAudienceErrors] = useState<Record<string, string>>({})
  const [audienceDone, setAudienceDone] = useState<Record<string, boolean>>({})

  const handleAudienceFile = useCallback(async (type: AudienceType, file: File) => {
    setAudienceUploading(type)
    setAudienceErrors(prev => ({ ...prev, [type]: '' }))
    try {
      const text = await file.text()
      let data: YandexAudience
      if (type === 'gender') {
        const result = parseYandexGender(text)
        if (result.female === 0 && result.male === 0 && result.unknown === 0) throw new Error('Не удалось распознать данные')
        data = { gender: result }
      } else if (type === 'age') {
        const result = parseYandexAge(text)
        if (result.length === 0) throw new Error('Не удалось распознать данные')
        data = { age: result }
      } else {
        const result = parseYandexCities(text)
        if (result.length === 0) throw new Error('Не удалось распознать данные')
        data = { cities: result }
      }
      uploadYandexAudience(podcastId, data)
      setAudienceDone(prev => ({ ...prev, [type]: true }))
    } catch (e) {
      setAudienceErrors(prev => ({ ...prev, [type]: e instanceof Error ? e.message : 'Ошибка' }))
    } finally {
      setAudienceUploading(null)
    }
  }, [podcastId, uploadYandexAudience])

  return { audienceUploading, audienceErrors, audienceDone, handleAudienceFile }
}
