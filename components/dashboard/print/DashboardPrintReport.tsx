'use client'

import type { ReactNode, RefObject } from 'react'
import type { NormalizedEpisode, Platform, PlayRecord, YandexAudience } from '@/types'
import type { PlatformMeta } from '@/lib/platforms'
import { PLATFORM_BY_KEY } from '@/lib/platforms'
import type { EpisodeSortKey } from '@/lib/dashboardMetrics'
import { formatExportDate, formatShortDate } from '@/lib/formatDate'
import {
  PrintPlatformChart,
  PrintTrendChart,
  PrintYandexAudienceSection,
} from '@/components/dashboard/PrintReportCharts'

export const PDF_EPISODE_LIMIT = 15

function PrintPage({
  title,
  exportDate,
  platformLabels,
  children,
  last = false,
}: {
  title: string
  exportDate: string
  platformLabels: string[]
  children: ReactNode
  last?: boolean
}) {
  return (
    <section className={`print-page ${last ? 'print-page-last' : ''}`}>
      <header className="print-page-header">
        <div>
          <div className="print-page-brand">
            {/* eslint-disable-next-line @next/next/no-img-element -- print DOM is serialized to HTML for headless Chromium, next/image would break it */}
            <img
              src="/brand/mono.png"
              alt="Podcast Stats"
              className="print-page-brand-logo"
            />
          </div>
          <h1 className="print-page-title">{title}</h1>
        </div>
        <div className="print-page-meta">
          <p>Экспорт: {exportDate}</p>
          <p>Платформы: {platformLabels.length > 0 ? platformLabels.join(', ') : 'нет данных'}</p>
        </div>
      </header>
      <div className="print-page-body">{children}</div>
    </section>
  )
}

interface Props {
  printRootRef: RefObject<HTMLDivElement | null>
  podcastTitle: string
  /** Платформы, включённые фильтром и загруженные */
  activePlatforms: readonly PlatformMeta[]
  episodes: NormalizedEpisode[]
  filteredEpisodes: NormalizedEpisode[]
  /** filteredEpisodes в порядке текущей сортировки таблицы */
  sortedFilteredEpisodes: NormalizedEpisode[]
  rawPlays: PlayRecord[]
  enabledPlatforms: Set<Platform>
  filteredTotals: Record<Platform, number>
  filteredTotal: number
  filteredAveragePerEpisode: number
  sortKey: EpisodeSortKey
  sortDesc: boolean
  audience: YandexAudience | null
}

function describeSort(sortKey: EpisodeSortKey, sortDesc: boolean): string {
  if (sortKey === 'total') return 'по суммарным прослушиваниям'
  if (sortKey === 'publishDate') return sortDesc ? 'по дате публикации (новые сверху)' : 'по дате публикации (старые сверху)'
  return `по платформе ${PLATFORM_BY_KEY[sortKey]?.label ?? sortKey}`
}

/** Печатная версия дашборда (PDF): сводка, топ эпизодов, аудитория Яндекса. */
export function DashboardPrintReport({
  printRootRef,
  podcastTitle,
  activePlatforms,
  episodes,
  filteredEpisodes,
  sortedFilteredEpisodes,
  rawPlays,
  enabledPlatforms,
  filteredTotals,
  filteredTotal,
  filteredAveragePerEpisode,
  sortKey,
  sortDesc,
  audience,
}: Props) {
  const exportDate = formatExportDate()
  const activePlatformLabels = activePlatforms.map(platform => platform.label)
  const topEpisodes = sortedFilteredEpisodes.slice(0, PDF_EPISODE_LIMIT)
  const showAudience = Boolean(audience && enabledPlatforms.has('yandex'))

  return (
    <div ref={printRootRef} className="print-only print-report-root">
      <PrintPage
        title={podcastTitle}
        exportDate={exportDate}
        platformLabels={activePlatformLabels}
      >
        <div className="space-y-3">
          <div className="print-summary-grid">
            <div className="print-summary-card print-summary-card--total">
              <p className="print-summary-label">Всего</p>
              <p className="print-summary-value">{filteredTotal.toLocaleString('ru')}</p>
              <p className="print-summary-subvalue">ср. {filteredAveragePerEpisode.toLocaleString('ru')} / эп.</p>
            </div>
            {activePlatforms
              .filter(platform => filteredTotals[platform.key] > 0)
              .map(platform => (
                <div key={platform.key} className="print-summary-card">
                  <p className="print-summary-label">{platform.label}</p>
                  <p className="print-summary-value text-[#1d1d1f]">
                    {filteredTotals[platform.key].toLocaleString('ru')}
                  </p>
                  <p className="print-summary-subvalue">
                    {filteredTotal > 0 ? Math.round(filteredTotals[platform.key] / filteredTotal * 100) : 0}%
                  </p>
                </div>
              ))}
          </div>
          <PrintTrendChart episodes={filteredEpisodes} />
          <div className="w-full max-w-[320px] print:break-inside-avoid-page">
            <PrintPlatformChart
              episodes={episodes}
              rawPlays={rawPlays}
              enabledPlatforms={enabledPlatforms}
            />
          </div>
        </div>
      </PrintPage>

      <PrintPage
        title={podcastTitle}
        exportDate={exportDate}
        platformLabels={activePlatformLabels}
        last={!showAudience}
      >
        <section className="bg-white rounded-2xl border border-[#e5e5ea] overflow-visible">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Топ-{PDF_EPISODE_LIMIT} эпизодов</h2>
            <span className="text-[12px] text-[#8e8e93]">{describeSort(sortKey, sortDesc)}</span>
          </div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[#8e8e93] text-[10px] uppercase tracking-wide">
                <th className="text-left px-3 py-2 font-medium w-[24px]">#</th>
                <th className="text-left px-2 py-2 font-medium">Эпизод</th>
                <th className="text-right px-2 py-2 font-medium">Дата</th>
                <th className="text-right px-2 py-2 font-medium">Итого</th>
                {activePlatforms.map(platform => (
                    <th key={platform.key} className="text-right px-2 py-2 font-medium">
                      {platform.label}
                    </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topEpisodes.map((episode, index) => (
                <tr key={episode.id} className={index === topEpisodes.length - 1 ? '' : 'border-b border-[#f5f5f7]'}>
                  <td className="px-3 py-2 text-[#8e8e93]">{index + 1}</td>
                  <td className="px-2 py-2 text-[#1d1d1f]">{episode.title}</td>
                  <td className="px-2 py-2 text-right text-[#8e8e93] whitespace-nowrap">
                    {formatShortDate(episode.publishDate)}
                  </td>
                  <td className="px-2 py-2 text-right font-semibold text-[#b150e2] whitespace-nowrap">
                    {episode.plays.total.toLocaleString('ru')}
                  </td>
                  {activePlatforms.map(platform => (
                    <td key={platform.key} className="px-2 py-2 text-right whitespace-nowrap">
                      {episode.plays[platform.key] > 0 ? episode.plays[platform.key].toLocaleString('ru') : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </PrintPage>

      {audience && showAudience && (
        <PrintPage
          title={podcastTitle}
          exportDate={exportDate}
          platformLabels={activePlatformLabels}
          last
        >
          <PrintYandexAudienceSection audience={audience} />
        </PrintPage>
      )}
    </div>
  )
}
