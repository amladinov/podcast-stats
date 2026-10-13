import type { NormalizedEpisode, PlayRecord, Platform } from '@/types'
import { getPlatformTotals } from '@/lib/podcastMetrics'
import { PLATFORM_KEYS, getPlatformLabel } from '@/lib/platforms'

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

// Порядок карточек: YouTube сразу после Яндекса, остальное по справочнику.
const CARD_ORDER: readonly Platform[] = ['mave', 'yandex', 'youtube', ...PLATFORM_KEYS.filter(key => !['mave', 'yandex', 'youtube'].includes(key))]

export function StatCards({ episodes, rawPlays, platformMeta, enabledPlatforms }: Props) {
  const totals = getPlatformTotals(episodes, rawPlays, enabledPlatforms)
  const total = PLATFORM_KEYS.reduce((sum, key) => sum + totals[key], 0)
  const avg = episodes.length > 0 ? Math.round(total / episodes.length) : 0

  const fmt = (n: number) => n.toLocaleString('ru')
  const pct = (n: number) => total > 0 ? `${Math.round(n / total * 100)}%` : '—'

  const cards = CARD_ORDER
    .map(key => ({ key, label: getPlatformLabel(key), value: totals[key] }))
    .filter(c => c.value > 0)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4 print:gap-2 print:mb-3">
      <div className="bg-[#b150e2] rounded-2xl p-5 text-white shadow-sm print:shadow-none print:p-4">
        <p className="text-white/70 text-[12px] font-medium uppercase tracking-wide mb-2">Всего</p>
        <p className="text-[26px] sm:text-[28px] font-bold leading-none mb-1">{fmt(total)}</p>
        <p className="text-white/60 text-[12px]">ср. {fmt(avg)} / эп.</p>
      </div>

      {cards.map(c => (
        <div key={c.key} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#e5e5ea] min-w-0 print:shadow-none print:p-4">
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
