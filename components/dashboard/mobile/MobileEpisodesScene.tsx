'use client'

import type { NormalizedEpisode } from '@/types'
import { formatShortDate } from '@/lib/formatDate'
import type { EpisodeSortKey } from '@/lib/dashboardMetrics'

export type EpisodeListMode = 'top' | 'all'

interface Props {
  episodesCount: number
  visibleEpisodes: NormalizedEpisode[]
  sortKey: EpisodeSortKey
  listMode: EpisodeListMode
  onSortKeyChange: (key: 'total' | 'publishDate') => void
  onListModeChange: (mode: EpisodeListMode) => void
  onSelectEpisode: (episodeId: string) => void
}

export function MobileEpisodesScene({
  episodesCount,
  visibleEpisodes,
  sortKey,
  listMode,
  onSortKeyChange,
  onListModeChange,
  onSelectEpisode,
}: Props) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between rounded-2xl border border-[#e5e5ea] bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Эпизоды</h2>
          <span className="text-[12px] text-[#8e8e93]">{episodesCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full border border-[#e5e5ea] bg-[#f5f5f7] p-0.5">
            {(['total', 'publishDate'] as const).map(key => (
              <button
                key={key}
                onClick={() => onSortKeyChange(key)}
                className={[
                  'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                  sortKey === key
                    ? 'bg-white text-[#7b57c8] shadow-sm'
                    : 'text-[#8e8e93]',
                ].join(' ')}
              >
                {key === 'total' ? 'Итого' : 'Дата'}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-full border border-[#e5e5ea] bg-[#f5f5f7] p-0.5">
            {(['top', 'all'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => onListModeChange(mode)}
                className={[
                  'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                  listMode === mode
                    ? 'bg-white text-[#7b57c8] shadow-sm'
                    : 'text-[#8e8e93]',
                ].join(' ')}
              >
                {mode === 'top' ? 'Топ' : 'Все'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        {visibleEpisodes.map((episode, index) => (
          <button
            key={episode.id}
            type="button"
            onClick={() => onSelectEpisode(episode.id)}
            className="w-full rounded-xl border border-[#e5e5ea] bg-white px-3.5 py-2.5 text-left shadow-sm transition-colors hover:border-[#d8c5ff]"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#b150e2]/12 text-[11px] font-semibold text-[#7b57c8]">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-[#1d1d1f]">{episode.title}</p>
                <p className="text-[11px] text-[#8e8e93]">{formatShortDate(episode.publishDate)}</p>
              </div>
              <p className="shrink-0 text-[15px] font-bold text-[#b150e2]">{episode.plays.total.toLocaleString('ru')}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
