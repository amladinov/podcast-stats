'use client'

import { useEffect, useRef, useState } from 'react'
import type { Platform } from '@/types'

/**
 * Фильтр «Источники для расчёта»: какие из загруженных платформ учитывать.
 * При смене подкаста сбрасывается на все загруженные; новые загрузки включаются автоматически;
 * последнюю включённую платформу выключить нельзя.
 */
export function useEnabledPlatforms(podcastId: string, uploadedPlatformKeys: Platform[]) {
  const [enabledPlatforms, setEnabledPlatforms] = useState<Set<Platform>>(
    () => new Set(uploadedPlatformKeys)
  )
  const previousPodcastIdRef = useRef<string | null>(null)

  useEffect(() => {
    setEnabledPlatforms(prev => {
      if (previousPodcastIdRef.current !== podcastId) {
        previousPodcastIdRef.current = podcastId
        return new Set(uploadedPlatformKeys)
      }

      let changed = false
      const next = new Set(prev)
      for (const platform of uploadedPlatformKeys) {
        if (!next.has(platform)) {
          next.add(platform)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [podcastId, uploadedPlatformKeys])

  function togglePlatform(platform: Platform) {
    setEnabledPlatforms(prev => {
      if (!uploadedPlatformKeys.includes(platform)) {
        return prev
      }

      const enabledUploadedCount = uploadedPlatformKeys.reduce((count, key) => {
        return prev.has(key) ? count + 1 : count
      }, 0)

      if (prev.has(platform) && enabledUploadedCount <= 1) {
        return prev
      }

      const next = new Set(prev)
      if (next.has(platform)) {
        next.delete(platform)
      } else {
        next.add(platform)
      }
      return next
    })
  }

  return { enabledPlatforms, togglePlatform }
}
