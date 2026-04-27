'use client'

import type { Platform } from '@/types'

const DASHBOARD_PLATFORMS = [
  { key: 'mave' as const, label: 'Mave', color: '#b150e2' },
  { key: 'yandex' as const, label: 'Яндекс', color: '#ff9f0a' },
  { key: 'spotify' as const, label: 'Spotify', color: '#30d158' },
  { key: 'vk' as const, label: 'VK', color: '#0a84ff' },
  { key: 'youtube' as const, label: 'YouTube', color: '#ff453a' },
]

interface Props {
  uploadedPlatforms: Platform[]
  enabledPlatforms: Set<Platform>
  onToggle: (platform: Platform) => void
}

export function PlatformFilters({ uploadedPlatforms, enabledPlatforms, onToggle }: Props) {
  const uploaded = new Set(uploadedPlatforms)
  const enabledCount = uploadedPlatforms.filter(platform => enabledPlatforms.has(platform)).length

  return (
    <div className="mb-4 print:hidden">
      <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8e8e93]">
        Источники для расчёта
      </p>
      <div className="flex flex-wrap gap-2">
        {DASHBOARD_PLATFORMS.filter(platform => uploaded.has(platform.key)).map(platform => {
          const active = enabledPlatforms.has(platform.key)
          const disableToggle = active && enabledCount <= 1

          return (
            <button
              key={platform.key}
              type="button"
              disabled={disableToggle}
              onClick={() => onToggle(platform.key)}
              className={[
                'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition-colors',
                disableToggle ? 'cursor-not-allowed opacity-60' : 'hover:opacity-80',
              ].join(' ')}
              style={active
                ? {
                    background: platform.color + '18',
                    borderColor: platform.color + '55',
                    color: platform.color,
                  }
                : {
                    background: '#f5f5f7',
                    borderColor: '#d2d2d7',
                    color: '#6e6e73',
                  }}
            >
              {active ? '✓' : '○'} {platform.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
