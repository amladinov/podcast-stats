import type { NormalizedEpisode, PlayRecord, Platform } from '@/types'
import { getPlatformTotals } from '@/lib/podcastMetrics'

type PlatformCardMeta = {
  label: string
  period?: string
  releases?: string
}

interface Props {
  episodes: NormalizedEpisode[]
  rawPlays: PlayRecord[]
  platformMeta: Partial<Record<Platform, PlatformCardMeta>>
  enabledPlatforms?: Set<Platform>
}

export function StatCards({ episodes, rawPlays, platformMeta, enabledPlatforms }: Props) {
  const totals = getPlatformTotals(episodes, rawPlays, enabledPlatforms)
  const mave = totals.mave
  const yandex = totals.yandex
  const spotify = totals.spotify
  const vk = totals.vk
  const youtube = totals.youtube
  const total = mave + yandex + spotify + vk + youtube
  const avg = episodes.length > 0 ? Math.round(total / episodes.length) : 0

  const fmt = (n: number) => n.toLocaleString('ru')
  const pct = (n: number) => total > 0 ? `${Math.round(n / total * 100)}%` : '—'

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4 print:gap-2 print:mb-3">
      <div className="bg-[#b150e2] rounded-2xl p-5 text-white shadow-sm print:shadow-none print:p-4">
        <p className="text-white/70 text-[12px] font-medium uppercase tracking-wide mb-2">Всего</p>
        <p className="text-[26px] sm:text-[28px] font-bold leading-none mb-1">{fmt(total)}</p>
        <p className="text-white/60 text-[12px]">ср. {fmt(avg)} / эп.</p>
      </div>

      {[
        { key: 'mave' as const, label: 'Mave', value: mave },
        { key: 'yandex' as const, label: 'Яндекс', value: yandex },
        { key: 'youtube' as const, label: 'YouTube', value: youtube },
        { key: 'spotify' as const, label: 'Spotify', value: spotify },
        { key: 'vk' as const, label: 'VK', value: vk },
      ].filter(c => c.value > 0).map(c => (
        <div key={c.label} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#e5e5ea] min-w-0 print:shadow-none print:p-4">
          <p className="text-[#6e6e73] text-[11px] sm:text-[12px] font-medium uppercase tracking-wide mb-2 break-words">{c.label}</p>
          <p className="text-[20px] sm:text-[22px] font-bold text-[#1d1d1f] leading-none mb-1 break-words">{fmt(c.value)}</p>
          <p className="text-[#aeaeb2] text-[12px]">{pct(c.value)}</p>
          {(platformMeta[c.key]?.period || platformMeta[c.key]?.releases) && (
            <p className="text-[#8e8e93] text-[11px] mt-1 break-words">
              {platformMeta[c.key]?.period ?? `выпуски: ${platformMeta[c.key]?.releases}`}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
