import type { Platform } from '@/types'

/**
 * Единый справочник платформ.
 * Добавление новой платформы: расширить тип Platform в types/index.ts
 * и добавить одну запись сюда. Остальной UI подхватит её автоматически.
 */
export interface PlatformMeta {
  key: Platform
  /** Короткое имя для таблиц, фильтров и графиков */
  label: string
  /** Полное имя для мастера загрузки */
  fullLabel: string
  color: string
}

export const PLATFORMS: readonly PlatformMeta[] = [
  { key: 'mave', label: 'Mave', fullLabel: 'Mave', color: '#b150e2' },
  { key: 'yandex', label: 'Яндекс', fullLabel: 'Яндекс Музыка', color: '#ff9f0a' },
  { key: 'spotify', label: 'Spotify', fullLabel: 'Spotify', color: '#30d158' },
  { key: 'vk', label: 'VK', fullLabel: 'ВКонтакте', color: '#0a84ff' },
  { key: 'vkvideo', label: 'VK Video', fullLabel: 'VK Video', color: '#00B6FF' },
  { key: 'youtube', label: 'YouTube', fullLabel: 'YouTube', color: '#ff0000' },
]

export const PLATFORM_KEYS: readonly Platform[] = PLATFORMS.map(platform => platform.key)

export const PLATFORM_BY_KEY: Record<Platform, PlatformMeta> = Object.fromEntries(
  PLATFORMS.map(platform => [platform.key, platform])
) as Record<Platform, PlatformMeta>

export function getPlatformLabel(key: Platform): string {
  return PLATFORM_BY_KEY[key]?.label ?? key
}

export function getPlatformColor(key: Platform): string {
  return PLATFORM_BY_KEY[key]?.color ?? '#aeaeb2'
}

/** Пустой объект сумм по всем платформам */
export function emptyPlatformTotals(): Record<Platform, number> {
  return Object.fromEntries(PLATFORM_KEYS.map(key => [key, 0])) as Record<Platform, number>
}
