'use client'

import type { NormalizedEpisode, Platform } from '@/types'

export interface MobilePlatformCard {
  key: Platform
  label: string
  color: string
  value: number
  pct: number
}

interface Props {
  total: number
  averagePerEpisode: number
  episodesCount: number
  platformCards: MobilePlatformCard[]
  topEpisodes: NormalizedEpisode[]
}

export function MobileSummaryScene({ total, averagePerEpisode, episodesCount, platformCards, topEpisodes }: Props) {
  return (
    <div className="flex h-full flex-col gap-2.5">
      {/* Hero — компактный */}
      <div className="rounded-[22px] bg-[#b150e2] px-4 py-3 text-white shadow-[0_16px_34px_rgba(177,80,226,0.24)]">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/60">Всего</p>
            <p className="mt-1 text-[32px] font-bold leading-none">{total.toLocaleString('ru')}</p>
          </div>
          <div className="text-right">
            <p className="text-[12px] text-white/60">ср. {averagePerEpisode.toLocaleString('ru')} / эп.</p>
            <p className="text-[12px] text-white/60">{episodesCount} выпусков</p>
          </div>
        </div>
      </div>

      {/* Платформы — компактная сетка */}
      <div className="grid grid-cols-2 gap-2">
        {platformCards.map(platform => (
          <div key={platform.key} className="rounded-2xl border border-[#e5e5ea] bg-white p-3 shadow-sm">
            <div className="flex items-baseline justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">{platform.label}</p>
              <p className="text-[11px] font-medium text-[#8e8e93]">{platform.pct}%</p>
            </div>
            <p className="mt-1.5 text-[21px] font-bold leading-none text-[#1d1d1f]">{platform.value.toLocaleString('ru')}</p>
            <div className="mt-2 h-[4px] overflow-hidden rounded-full bg-[#f0f0f0]">
              <div
                className="h-full rounded-full"
                style={{ width: `${platform.pct}%`, backgroundColor: platform.color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Топ эпизоды — заполняет остаток */}
      {topEpisodes.length > 0 && (
        <div className="flex flex-1 flex-col rounded-2xl border border-[#e5e5ea] bg-white shadow-sm">
          <p className="px-4 pt-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">Топ эпизоды</p>
          <div className="flex flex-1 flex-col">
            {topEpisodes.slice(0, 3).map((episode, index) => (
              <div key={episode.id} className={`flex items-center gap-3 px-4 py-2.5 ${index < 2 ? 'border-b border-[#f0f0f0]' : ''}`}>
                <span className="text-[13px] font-semibold text-[#b150e2]">{index + 1}</span>
                <p className="flex-1 truncate text-[13px] text-[#1d1d1f]">{episode.title}</p>
                <p className="shrink-0 text-[13px] font-semibold text-[#1d1d1f]">{episode.plays.total.toLocaleString('ru')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
