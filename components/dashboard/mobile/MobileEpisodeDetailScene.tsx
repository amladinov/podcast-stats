'use client'

import type { NormalizedEpisode } from '@/types'
import type { PlatformMeta } from '@/lib/platforms'
import { formatShortDate } from '@/lib/formatDate'

interface Props {
  episode: NormalizedEpisode
  /** Платформы, по которым есть загруженные данные */
  platforms: readonly PlatformMeta[]
  onBack: () => void
}

export function MobileEpisodeDetailScene({ episode, platforms, onBack }: Props) {
  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-full border border-[#e5e5ea] bg-white px-3 py-2 text-[13px] font-medium text-[#7b57c8] shadow-sm"
      >
        ← К списку эпизодов
      </button>

      <div className="rounded-[26px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,244,255,0.94)_45%,rgba(247,249,255,0.96))] p-4 shadow-[0_16px_36px_rgba(29,29,31,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#8e8e93]">Эпизод</p>
            <p className="mt-2 text-[24px] font-bold leading-tight text-[#1d1d1f]">{episode.title}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#8e8e93]">Итого</p>
            <p className="mt-2 text-[28px] font-bold leading-none text-[#b150e2]">
              {episode.plays.total.toLocaleString('ru')}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[13px] text-[#6e6e73]">{formatShortDate(episode.publishDate)}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {platforms.map(platform => (
          <div key={platform.key} className="rounded-2xl border border-[#e5e5ea] bg-white p-3 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.1em] text-[#8e8e93]">{platform.label}</p>
            <p className="mt-2 text-[20px] font-semibold leading-none text-[#1d1d1f]">
              {episode.plays[platform.key] > 0 ? episode.plays[platform.key].toLocaleString('ru') : '—'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
