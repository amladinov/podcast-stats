'use client'

import { useParams, useRouter } from 'next/navigation'
import { SafePodcastImage } from '@/components/SafePodcastImage'
import { usePodcastStore } from '@/lib/store'
import { DEMO_IDS, DEMO_INSIGHTS_MAP } from '@/lib/demoData'
import { getPlatformTotals, getTotalPlays } from '@/lib/podcastMetrics'
import { StatCards } from '@/components/dashboard/StatCards'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { PlatformChart } from '@/components/dashboard/PlatformChart'
import { EpisodeTable } from '@/components/dashboard/EpisodeTable'
import { AIInsights } from '@/components/dashboard/AIInsights'
import { YandexAudienceSection } from '@/components/dashboard/YandexAudienceSection'
import {
  PrintPlatformChart,
  PrintTrendChart,
  PrintYandexAudienceSection,
} from '@/components/dashboard/PrintReportCharts'
import { formatCompactPeriod, getEpisodeRangeFromNormalized, getPeriodFromPlays } from '@/lib/platformPeriods'

const DASHBOARD_PLATFORMS = [
  { key: 'mave', label: 'Mave', color: '#b150e2' },
  { key: 'yandex', label: 'Яндекс', color: '#ff9f0a' },
  { key: 'spotify', label: 'Spotify', color: '#30d158' },
  { key: 'vk', label: 'VK', color: '#0a84ff' },
  { key: 'youtube', label: 'YouTube', color: '#ff453a' },
] as const

function formatExportDate(): string {
  return new Date().toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function sanitizePrintTitle(title: string): string {
  const sanitized = title
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return sanitized || 'Podcast Stats'
}

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
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <section className={`print-page ${last ? 'print-page-last' : ''}`}>
      <header className="print-page-header">
        <div>
          <p className="print-page-eyebrow">Сделано в Podcast Stats</p>
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

export default function DashboardPage() {
  const { podcastId } = useParams<{ podcastId: string }>()
  const router = useRouter()
  const podcast = usePodcastStore(s => s.getPodcast(podcastId))

  if (!podcast) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-[#6e6e73]">Подкаст не найден</p>
        <button onClick={() => router.push('/')} className="mt-4 text-[#b150e2] text-sm hover:underline">На главную</button>
      </main>
    )
  }

  const isDemo = DEMO_IDS.has(podcastId)
  const episodes = podcast.normalized
  const uploadedPlatforms = new Set(podcast.uploadedPlatforms.map(platform => platform.platform))
  const exportDate = formatExportDate()
  const activePlatformLabels = DASHBOARD_PLATFORMS
    .filter(platform => uploadedPlatforms.has(platform.key))
    .map(platform => platform.label)
  const printTopEpisodes = [...episodes]
    .sort((a, b) => b.plays.total - a.plays.total)
    .slice(0, 10)
  const printTotals = getPlatformTotals(episodes, podcast.rawPlays)
  const printTotal = getTotalPlays(episodes)
  const averagePerEpisode = episodes.length > 0 ? Math.round(printTotal / episodes.length) : 0
  const statCardMeta = Object.fromEntries(
    podcast.uploadedPlatforms.map(platform => {
      const fallback = getPeriodFromPlays(podcast.rawPlays.filter(play => play.platform === platform.platform))
      const period = formatCompactPeriod(platform.periodStart ?? fallback.periodStart, platform.periodEnd ?? fallback.periodEnd)
      const episodeRange = platform.platform === 'yandex'
        ? getEpisodeRangeFromNormalized(episodes, 'yandex')
        : {}
      const releases = platform.platform === 'yandex'
        ? formatCompactPeriod(episodeRange.periodStart, episodeRange.periodEnd)
        : null

      return [platform.platform, {
        label: DASHBOARD_PLATFORMS.find(item => item.key === platform.platform)?.label ?? platform.platform,
        period: period ?? undefined,
        releases: releases ?? undefined,
      }]
    })
  )

  const handlePrintPdf = () => {
    if (typeof window === 'undefined') return

    const originalTitle = document.title
    const printTitle = sanitizePrintTitle(podcast.title)
    let restored = false

    const restoreTitle = () => {
      if (restored) return
      restored = true
      document.title = originalTitle
      window.removeEventListener('afterprint', restoreTitle)
    }

    document.title = printTitle
    window.addEventListener('afterprint', restoreTitle, { once: true })
    window.setTimeout(restoreTitle, 1500)
    window.print()
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e5ea] print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-start sm:items-center gap-3">
          <button onClick={() => router.push('/')} className="text-[#b150e2] text-[14px] font-medium hover:opacity-70 transition-opacity flex-shrink-0">
            ← Назад
          </button>
          {podcast.imageUrl && (
            <SafePodcastImage src={podcast.imageUrl} alt={podcast.title} width={36} height={36} className="rounded-xl object-cover shadow-sm flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0 basis-[calc(100%-52px)] sm:basis-auto">
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] sm:text-[17px] font-semibold text-[#1d1d1f] truncate">{podcast.title}</h1>
              {isDemo && (
                <span className="text-[10px] font-semibold bg-[#b150e2]/10 text-[#b150e2] px-1.5 py-0.5 rounded-md border border-[#b150e2]/20 flex-shrink-0">
                  ДЕМО
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              {isDemo && <span className="text-[11px] text-[#aeaeb2]">Демо-данные ·</span>}
              {DASHBOARD_PLATFORMS.map(platform => {
                const isUploaded = uploadedPlatforms.has(platform.key)

                return (
                  <span
                    key={platform.key}
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                    style={isUploaded
                      ? {
                          background: platform.color + '20',
                          color: platform.color,
                          border: `1px solid ${platform.color}40`,
                        }
                      : {
                          background: '#f5f5f7',
                          color: '#aeaeb2',
                          border: '1px solid #d2d2d7',
                          textDecoration: 'line-through',
                          textDecorationThickness: '1.5px',
                        }}
                  >
                    {platform.label}
                  </span>
                )
              })}
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {episodes.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 sm:flex-none">
                <button
                  onClick={handlePrintPdf}
                  className="text-[13px] bg-[#1d1d1f] hover:opacity-90 text-white px-4 py-2 rounded-xl transition-colors font-medium border border-[#1d1d1f] flex-1 sm:flex-none"
                >
                  Экспорт в PDF
                </button>
                <p className="text-[11px] text-[#8e8e93] sm:max-w-[220px] leading-[1.35]">
                  Перед сохранением PDF отключи `Headers and footers` в окне печати браузера.
                </p>
              </div>
            )}
            <button
              onClick={() => router.push('/compare')}
              className="text-[13px] bg-[#f5f5f7] hover:bg-[#e5e5ea] text-[#6e6e73] px-4 py-2 rounded-xl transition-colors font-medium border border-[#e5e5ea] flex-1 sm:flex-none"
            >
              Сравнить
            </button>
            <button
              onClick={() => router.push(`/${podcastId}/setup`)}
              className="text-[13px] bg-[#f5f5f7] hover:bg-[#e5e5ea] text-[#1d1d1f] px-3 sm:px-4 py-2 rounded-xl transition-colors font-medium border border-[#e5e5ea] flex-1 sm:flex-none"
            >
              + Данные
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 screen-only">
        {episodes.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-[#6e6e73] mb-4 text-[15px]">Данных пока нет</p>
            <button onClick={() => router.push(`/${podcastId}/setup`)} className="text-[#b150e2] hover:underline text-[14px]">
              Загрузить CSV
            </button>
          </div>
        ) : (
          <>
            <StatCards episodes={episodes} rawPlays={podcast.rawPlays} platformMeta={statCardMeta} />
            <TrendChart episodes={episodes} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 print:grid-cols-3 print:gap-3">
              <div className="md:col-span-1 print:col-span-1">
                <PlatformChart episodes={episodes} rawPlays={podcast.rawPlays} />
              </div>
              <div className="md:col-span-2 print:col-span-2">
                <AIInsights
                  episodes={episodes}
                  podcastTitle={podcast.title}
                  initialInsights={DEMO_INSIGHTS_MAP[podcastId]}
                />
              </div>
            </div>
            <EpisodeTable episodes={episodes} />
            {podcast.yandexAudience && (
              <YandexAudienceSection audience={podcast.yandexAudience} />
            )}
          </>
        )}
      </main>

      {episodes.length > 0 && (
        <div className="print-only print-report-root">
          <PrintPage
            title={podcast.title}
            exportDate={exportDate}
            platformLabels={activePlatformLabels}
          >
            <div className="space-y-3">
              <div className="print-summary-grid">
                <div className="print-summary-card print-summary-card--total">
                  <p className="print-summary-label">Всего</p>
                  <p className="print-summary-value">{printTotal.toLocaleString('ru')}</p>
                  <p className="print-summary-subvalue">ср. {averagePerEpisode.toLocaleString('ru')} / эп.</p>
                </div>
                {DASHBOARD_PLATFORMS
                  .filter(platform => printTotals[platform.key] > 0)
                  .map(platform => (
                    <div key={platform.key} className="print-summary-card">
                      <p className="print-summary-label">{platform.label}</p>
                      <p className="print-summary-value text-[#1d1d1f]">
                        {printTotals[platform.key].toLocaleString('ru')}
                      </p>
                      <p className="print-summary-subvalue">
                        {printTotal > 0 ? Math.round(printTotals[platform.key] / printTotal * 100) : 0}%
                      </p>
                    </div>
                  ))}
              </div>
              <PrintTrendChart episodes={episodes} />
              <div className="w-full max-w-[320px]">
                <PrintPlatformChart episodes={episodes} rawPlays={podcast.rawPlays} />
              </div>
            </div>
          </PrintPage>

          <PrintPage
            title={podcast.title}
            exportDate={exportDate}
            platformLabels={activePlatformLabels}
            last={!podcast.yandexAudience}
          >
            <section className="bg-white rounded-2xl border border-[#e5e5ea] overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Топ-10 эпизодов</h2>
                <span className="text-[12px] text-[#8e8e93]">по суммарным прослушиваниям</span>
              </div>
              <table className="w-full text-[13px]">
                <thead className="border-y border-[#f0f0f0]">
                  <tr className="text-[#8e8e93] text-[11px] uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-medium">#</th>
                    <th className="text-left px-4 py-3 font-medium">Эпизод</th>
                    <th className="text-right px-4 py-3 font-medium">Дата</th>
                    <th className="text-right px-4 py-3 font-medium">Итого</th>
                    <th className="text-right px-4 py-3 font-medium">Яндекс</th>
                    <th className="text-right px-4 py-3 font-medium">Mave</th>
                    <th className="text-right px-5 py-3 font-medium">YouTube</th>
                  </tr>
                </thead>
                <tbody>
                  {printTopEpisodes.map((episode, index) => (
                    <tr key={episode.id} className="border-b border-[#f5f5f7]">
                      <td className="px-5 py-3 text-[#8e8e93]">{index + 1}</td>
                      <td className="px-4 py-3 text-[#1d1d1f]">{episode.title}</td>
                      <td className="px-4 py-3 text-right text-[#8e8e93] whitespace-nowrap">
                        {episode.publishDate
                          ? new Date(episode.publishDate).toLocaleDateString('ru', {
                              day: 'numeric',
                              month: 'short',
                              year: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#b150e2] whitespace-nowrap">
                        {episode.plays.total.toLocaleString('ru')}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">{episode.plays.yandex.toLocaleString('ru')}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">{episode.plays.mave.toLocaleString('ru')}</td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">{episode.plays.youtube.toLocaleString('ru')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </PrintPage>

          {podcast.yandexAudience && (
            <PrintPage
              title={podcast.title}
              exportDate={exportDate}
              platformLabels={activePlatformLabels}
              last
            >
              <PrintYandexAudienceSection audience={podcast.yandexAudience} />
            </PrintPage>
          )}
        </div>
      )}
    </div>
  )
}
