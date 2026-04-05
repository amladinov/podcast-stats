'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
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
import { getCtaClasses } from '@/lib/ctaStyles'
import {
  PrintPlatformChart,
  PrintTrendChart,
  PrintYandexAudienceSection,
} from '@/components/dashboard/PrintReportCharts'
import { formatCompactPeriod, getEpisodeRangeFromNormalized, getPeriodFromPlays } from '@/lib/platformPeriods'
import type { Platform } from '@/types'

const DASHBOARD_PLATFORMS = [
  { key: 'mave', label: 'Mave', color: '#b150e2' },
  { key: 'yandex', label: 'Яндекс', color: '#ff9f0a' },
  { key: 'spotify', label: 'Spotify', color: '#30d158' },
  { key: 'vk', label: 'VK', color: '#0a84ff' },
  { key: 'youtube', label: 'YouTube', color: '#ff453a' },
] as const

const GENDER_COLORS: Record<string, string> = {
  'Женщины': '#ff6b9d',
  'Мужчины': '#0a84ff',
  'Не определён': '#aeaeb2',
}

const AGE_COLORS = ['#b150e2', '#0a84ff', '#ff9f0a', '#30d158', '#ff6b9d', '#ff453a', '#aeaeb2']

type EpisodeSortKey = 'total' | 'publishDate' | Platform

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

function formatShortDate(date: string | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('ru', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  })
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

function MobileAudienceDonutSection({
  title,
  data,
  compact = false,
}: {
  title: string
  data: { name: string; value: number; color: string }[]
  compact?: boolean
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  if (total === 0) return null

  return (
    <div className={`rounded-2xl border border-[#e5e5ea] bg-white shadow-sm ${compact ? 'p-3' : 'p-4'}`}>
      <h3 className={`font-semibold uppercase tracking-[0.12em] text-[#8e8e93] ${compact ? 'text-[10px]' : 'text-[12px]'}`}>{title}</h3>
      <ResponsiveContainer width="100%" height={compact ? 100 : 150}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={compact ? 28 : 40}
            outerRadius={compact ? 44 : 62}
            paddingAngle={2}
            dataKey="value"
            activeShape={false}
            rootTabIndex={-1}
          >
            {data.map(entry => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #e5e5ea', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
            formatter={(value: unknown, _name: unknown, props: { payload?: { name: string } }) => {
              const pct = total > 0 ? Math.round((value as number) / total * 100) : 0
              return [`${pct}%`, props.payload?.name ?? '']
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
        {data.map(item => (
          <div key={item.name} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className={`flex-shrink-0 rounded-full ${compact ? 'h-2 w-2' : 'h-2.5 w-2.5'}`} style={{ background: item.color }} />
              <span className={`text-[#1d1d1f] ${compact ? 'text-[11px]' : 'text-[13px]'}`}>{item.name}</span>
            </div>
            <span className={`text-[#6e6e73] ${compact ? 'text-[11px]' : 'text-[13px]'}`}>{Math.round(item.value / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { podcastId } = useParams<{ podcastId: string }>()
  const router = useRouter()
  const podcast = usePodcastStore(s => s.getPodcast(podcastId))
  const comparablePodcastCount = usePodcastStore(s => s.podcasts.filter(item => item.uploadedPlatforms.length > 0).length)

  const [dashboardSceneIndex, setDashboardSceneIndex] = useState(0)
  const [mobileViewportHeight, setMobileViewportHeight] = useState(0)
  const [mobileChromeHeight, setMobileChromeHeight] = useState(0)
  const [episodeSortKey, setEpisodeSortKey] = useState<EpisodeSortKey>('total')
  const [episodeListMode, setEpisodeListMode] = useState<'top' | 'all'>('top')
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null)
  const [citiesExpanded, setCitiesExpanded] = useState(false)
  const mobileChromeRef = useRef<HTMLDivElement | null>(null)
  const mobileSceneContentRefs = useRef<Array<HTMLDivElement | null>>([])
  const mobileTouchStartRef = useRef<{ x: number; y: number } | null>(null)

  const isDemo = podcast ? DEMO_IDS.has(podcastId) : false
  const podcastTitle = podcast?.title ?? ''
  const podcastImageUrl = podcast?.imageUrl ?? ''
  const episodes = podcast?.normalized ?? []
  const rawPlays = podcast?.rawPlays ?? []
  const uploadedPlatformsArray = podcast?.uploadedPlatforms ?? []
  const uploadedPlatformKeys = uploadedPlatformsArray.map(platform => platform.platform)
  const uploadedPlatforms = new Set(uploadedPlatformKeys)
  const exportDate = formatExportDate()
  const activePlatformLabels = DASHBOARD_PLATFORMS
    .filter(platform => uploadedPlatforms.has(platform.key))
    .map(platform => platform.label)
  const printTopEpisodes = [...episodes]
    .sort((a, b) => b.plays.total - a.plays.total)
    .slice(0, 10)
  const printTotals = getPlatformTotals(episodes, rawPlays)
  const printTotal = getTotalPlays(episodes)
  const averagePerEpisode = episodes.length > 0 ? Math.round(printTotal / episodes.length) : 0
  const canCompare = comparablePodcastCount >= 2

  const statCardMeta = Object.fromEntries(
    uploadedPlatformsArray.map(platform => {
      const fallback = getPeriodFromPlays(rawPlays.filter(play => play.platform === platform.platform))
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

  const mobileDashboardScenes = useMemo(() => {
    const scenes = [
      { id: 'overview', label: 'Управление' },
      { id: 'summary', label: 'Сводка' },
      { id: 'charts', label: 'Графики' },
      // { id: 'ai', label: 'AI' }, // временно скрыт
      { id: 'episodes', label: 'Эпизоды' },
    ]

    if (podcast?.yandexAudience) {
      scenes.push(
        { id: 'audience', label: 'Аудитория' },
        { id: 'cities', label: 'Города' },
      )
    }

    return scenes
  }, [podcast?.yandexAudience])

  const dashboardTotalScenes = mobileDashboardScenes.length
  const mobileSceneViewportHeight = mobileViewportHeight > 0
    ? Math.max(mobileViewportHeight - mobileChromeHeight, 0)
    : 0

  const mobilePlatformCards = DASHBOARD_PLATFORMS
    .map(platform => ({
      ...platform,
      value: printTotals[platform.key],
      pct: printTotal > 0 ? Math.round(printTotals[platform.key] / printTotal * 100) : 0,
      meta: statCardMeta[platform.key],
    }))
    .filter(platform => platform.value > 0)

  const episodeSortOptions = [
    { key: 'total' as const, label: 'Итого' },
    { key: 'publishDate' as const, label: 'Дата' },
    ...DASHBOARD_PLATFORMS.filter(platform => uploadedPlatforms.has(platform.key)).map(platform => ({
      key: platform.key,
      label: platform.label,
    })),
  ]

  const sortedEpisodes = [...episodes].sort((a, b) => {
    if (episodeSortKey === 'publishDate') {
      return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
    }

    const aValue = episodeSortKey === 'total' ? a.plays.total : a.plays[episodeSortKey]
    const bValue = episodeSortKey === 'total' ? b.plays.total : b.plays[episodeSortKey]
    return bValue - aValue
  })

  const visibleEpisodes = episodeListMode === 'top' ? sortedEpisodes.slice(0, 10) : sortedEpisodes
  const audience = podcast?.yandexAudience ?? null
  const genderData = audience?.gender
    ? [
        { name: 'Женщины', value: audience.gender.female, color: GENDER_COLORS['Женщины'] },
        { name: 'Мужчины', value: audience.gender.male, color: GENDER_COLORS['Мужчины'] },
        ...(audience.gender.unknown > 0 ? [{ name: 'Не определён', value: audience.gender.unknown, color: GENDER_COLORS['Не определён'] }] : []),
      ].filter(item => item.value > 0)
    : []
  const ageData = audience?.age
    ? audience.age.map((item, index) => ({ name: item.range, value: item.count, color: AGE_COLORS[index % AGE_COLORS.length] })).filter(item => item.value > 0)
    : []
  const activeDashboardSceneIndex = Math.min(dashboardSceneIndex, Math.max(dashboardTotalScenes - 1, 0))
  const selectedEpisode = selectedEpisodeId
    ? episodes.find(episode => episode.id === selectedEpisodeId) ?? null
    : null
  const isOverviewScene = activeDashboardSceneIndex === 0

  useEffect(() => {
    if (typeof window === 'undefined') return

    const html = document.documentElement
    const body = document.body
    const previousHtmlOverflow = html.style.overflow
    const previousBodyOverflow = body.style.overflow
    const previousBodyOverscroll = body.style.overscrollBehaviorY

    const syncMobileViewportLock = () => {
      if (window.matchMedia('(max-width: 767px)').matches) {
        html.style.overflow = 'hidden'
        body.style.overflow = 'hidden'
        body.style.overscrollBehaviorY = 'none'
      } else {
        html.style.overflow = previousHtmlOverflow
        body.style.overflow = previousBodyOverflow
        body.style.overscrollBehaviorY = previousBodyOverscroll
      }
    }

    syncMobileViewportLock()
    window.addEventListener('resize', syncMobileViewportLock)

    return () => {
      window.removeEventListener('resize', syncMobileViewportLock)
      html.style.overflow = previousHtmlOverflow
      body.style.overflow = previousBodyOverflow
      body.style.overscrollBehaviorY = previousBodyOverscroll
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const syncMobileHeights = () => {
      // Измеряем реальную видимую высоту через CSS dvh (dynamic viewport height)
      const probe = document.createElement('div')
      probe.style.cssText = 'position:fixed;top:0;height:100dvh;pointer-events:none;visibility:hidden'
      document.body.appendChild(probe)
      const dvh = probe.offsetHeight
      document.body.removeChild(probe)

      setMobileViewportHeight(dvh || window.visualViewport?.height || window.innerHeight)
      setMobileChromeHeight(mobileChromeRef.current?.offsetHeight ?? 0)
    }

    syncMobileHeights()
    window.addEventListener('resize', syncMobileHeights)
    window.addEventListener('orientationchange', syncMobileHeights)
    window.visualViewport?.addEventListener('resize', syncMobileHeights)

    return () => {
      window.removeEventListener('resize', syncMobileHeights)
      window.removeEventListener('orientationchange', syncMobileHeights)
      window.visualViewport?.removeEventListener('resize', syncMobileHeights)
    }
  }, [dashboardTotalScenes, uploadedPlatformKeys.length, isDemo, podcastTitle, episodes.length])

  const handlePrintPdf = () => {
    if (typeof window === 'undefined') return

    const originalTitle = document.title
    const printTitle = sanitizePrintTitle(podcastTitle)
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

  function handleMobileTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0]
    mobileTouchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  function handleMobileTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const start = mobileTouchStartRef.current
    mobileTouchStartRef.current = null
    if (!start) return

    const touch = event.changedTouches[0]
    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y

    if (Math.abs(deltaY) < 56 || Math.abs(deltaY) < Math.abs(deltaX) * 1.2) return

    const currentContent = mobileSceneContentRefs.current[activeDashboardSceneIndex]
    const canScrollInside = Boolean(currentContent && currentContent.scrollHeight > currentContent.clientHeight + 4)
    const scrollTop = currentContent?.scrollTop ?? 0
    const nearBottom = !currentContent || scrollTop + currentContent.clientHeight >= currentContent.scrollHeight - 4

    if (deltaY < 0) {
      if (canScrollInside && !nearBottom) return
      if (activeDashboardSceneIndex < dashboardTotalScenes - 1) {
        setDashboardSceneIndex(prev => prev + 1)
      } else {
        setDashboardSceneIndex(0)
      }
      return
    }

    if (scrollTop > 4) return
    if (activeDashboardSceneIndex > 0) {
      setDashboardSceneIndex(prev => prev - 1)
    }
  }

  const renderMobileOverviewScene = () => (
    <div className="h-full">
      <div className="flex h-full min-h-0 flex-col rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,244,255,0.94)_48%,rgba(247,249,255,0.97))] px-4 py-4 shadow-[0_18px_38px_rgba(29,29,31,0.07)]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#7b57c8] shadow-sm">
            Dashboard
          </div>
          <h2 className="mt-3 text-[25px] font-bold leading-[0.95] tracking-tight text-[#1d1d1f]">
            Вся картина
            <br /> по подкасту
            <br /> на 7 экранах
          </h2>
          <p className="mt-2.5 max-w-[280px] text-[13px] leading-snug text-[#4a4a52]">
            Свайпай вверх: сводка, графики, эпизоды.
          </p>
        </div>

        <div className="flex flex-1 flex-col justify-center">
          {printTotal > 0 ? (
            <div className="rounded-[22px] bg-gradient-to-br from-[#7b57c8] to-[#9b6fe3] px-5 py-5 text-center shadow-[0_12px_28px_rgba(123,87,200,0.25)]">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/70">Всего прослушиваний</p>
              <p className="mt-2 text-[40px] font-bold leading-none text-white">{printTotal.toLocaleString('ru')}</p>
              <p className="mt-1.5 text-[13px] text-white/60">ср. {averagePerEpisode.toLocaleString('ru')} / эп.</p>
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-[#d4c4f0] bg-[#f8f4ff] px-5 py-5 text-center">
              <p className="text-[14px] font-medium text-[#7b57c8]">Загрузите CSV</p>
              <p className="mt-1 text-[12px] text-[#8e8e93]">чтобы увидеть статистику</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[22px] border border-[#efe5ff] bg-white/82 px-4 py-3 shadow-[0_10px_24px_rgba(177,80,226,0.05)]">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#8e8e93]">Эпизоды</p>
            <p className="mt-1.5 text-[22px] font-semibold leading-none text-[#1d1d1f]">{episodes.length}</p>
            <p className="mt-1 text-[11px] text-[#8e8e93]">выпусков</p>
          </div>
          <div className="rounded-[22px] border border-[#efe5ff] bg-white/82 px-4 py-3 shadow-[0_10px_24px_rgba(177,80,226,0.05)]">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#8e8e93]">Платформы</p>
            <p className="mt-1.5 text-[22px] font-semibold leading-none text-[#1d1d1f]">{activePlatformLabels.length}</p>
            <p className="mt-1 truncate text-[11px] text-[#8e8e93]">{activePlatformLabels.join(', ') || '—'}</p>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handlePrintPdf}
            className={getCtaClasses({ tone: 'dark', fullWidth: true })}
          >
            Экспорт в PDF
          </button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={() => router.push('/compare')}
              disabled={!canCompare}
              className={[
                getCtaClasses({
                  tone: 'secondary',
                  size: 'compact',
                  fullWidth: true,
                  disabled: !canCompare,
                }),
                'text-[13px] text-[#6e6e73]',
              ].join(' ')}
            >
              Сравнить
            </button>
            <button
              onClick={() => router.push(`/${podcastId}/setup`)}
              className={`${getCtaClasses({ tone: 'secondary', size: 'compact', fullWidth: true })} text-[13px]`}
            >
              + Данные
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderMobileSummaryScene = () => (
    <div className="flex h-full flex-col gap-2.5">
      {/* Hero — компактный */}
      <div className="rounded-[22px] bg-[#b150e2] px-4 py-3 text-white shadow-[0_16px_34px_rgba(177,80,226,0.24)]">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/60">Всего</p>
            <p className="mt-1 text-[32px] font-bold leading-none">{printTotal.toLocaleString('ru')}</p>
          </div>
          <div className="text-right">
            <p className="text-[12px] text-white/60">ср. {averagePerEpisode.toLocaleString('ru')} / эп.</p>
            <p className="text-[12px] text-white/60">{episodes.length} выпусков</p>
          </div>
        </div>
      </div>

      {/* Платформы — компактная сетка */}
      <div className="grid grid-cols-2 gap-2">
        {mobilePlatformCards.map(platform => (
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
      {printTopEpisodes.length > 0 && (
        <div className="flex flex-1 flex-col rounded-2xl border border-[#e5e5ea] bg-white shadow-sm">
          <p className="px-4 pt-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">Топ эпизоды</p>
          <div className="flex flex-1 flex-col">
            {printTopEpisodes.slice(0, 3).map((episode, index) => (
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

  const renderMobileChartsScene = () => (
    <div className="flex flex-col gap-4">
      <TrendChart episodes={episodes} compact />
      <PlatformChart episodes={episodes} rawPlays={rawPlays} compact />
    </div>
  )

  const renderMobileAiScene = () => (
    <AIInsights
      episodes={episodes}
      podcastTitle={podcastTitle}
      initialInsights={DEMO_INSIGHTS_MAP[podcastId]}
      compact
    />
  )

  const renderMobileEpisodesScene = () => (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between rounded-2xl border border-[#e5e5ea] bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Эпизоды</h2>
          <span className="text-[12px] text-[#8e8e93]">{episodes.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full border border-[#e5e5ea] bg-[#f5f5f7] p-0.5">
            {(['total', 'publishDate'] as const).map(key => (
              <button
                key={key}
                onClick={() => setEpisodeSortKey(key)}
                className={[
                  'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                  episodeSortKey === key
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
                onClick={() => setEpisodeListMode(mode)}
                className={[
                  'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                  episodeListMode === mode
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
            onClick={() => setSelectedEpisodeId(episode.id)}
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

  const renderMobileEpisodeDetailScene = () => {
    if (!selectedEpisode) return null

    const fullBreakdown = DASHBOARD_PLATFORMS.filter(platform => uploadedPlatforms.has(platform.key))

    return (
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={() => setSelectedEpisodeId(null)}
          className="inline-flex items-center gap-2 rounded-full border border-[#e5e5ea] bg-white px-3 py-2 text-[13px] font-medium text-[#7b57c8] shadow-sm"
        >
          ← К списку эпизодов
        </button>

        <div className="rounded-[26px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,244,255,0.94)_45%,rgba(247,249,255,0.96))] p-4 shadow-[0_16px_36px_rgba(29,29,31,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#8e8e93]">Эпизод</p>
              <p className="mt-2 text-[24px] font-bold leading-tight text-[#1d1d1f]">{selectedEpisode.title}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#8e8e93]">Итого</p>
              <p className="mt-2 text-[28px] font-bold leading-none text-[#b150e2]">
                {selectedEpisode.plays.total.toLocaleString('ru')}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[13px] text-[#6e6e73]">{formatShortDate(selectedEpisode.publishDate)}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {fullBreakdown.map(platform => (
            <div key={platform.key} className="rounded-2xl border border-[#e5e5ea] bg-white p-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.1em] text-[#8e8e93]">{platform.label}</p>
              <p className="mt-2 text-[20px] font-semibold leading-none text-[#1d1d1f]">
                {selectedEpisode.plays[platform.key] > 0 ? selectedEpisode.plays[platform.key].toLocaleString('ru') : '—'}
              </p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderMobileAudienceScene = () => {
    const renderBarSection = (title: string, data: { name: string; value: number; color: string }[]) => {
      const total = data.reduce((s, d) => s + d.value, 0)
      if (total === 0) return null
      const maxPct = Math.max(...data.map(d => d.value / total))

      return (
        <div className="flex flex-1 flex-col rounded-2xl border border-[#e5e5ea] bg-white p-4 shadow-sm">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8e8e93]">{title}</h3>
          <div className="mt-3 flex flex-1 flex-col justify-center gap-2.5">
            {data.map(item => {
              const pct = Math.round(item.value / total * 100)
              const barWidth = maxPct > 0 ? (item.value / total / maxPct) * 100 : 0
              return (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="w-[72px] shrink-0 text-[13px] text-[#1d1d1f]">{item.name}</span>
                  <div className="flex-1 h-[20px] overflow-hidden rounded-full bg-[#f0f0f0]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${barWidth}%`, backgroundColor: item.color }}
                    />
                  </div>
                  <span className="w-[32px] shrink-0 text-right text-[13px] font-semibold text-[#1d1d1f]">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    return (
      <div className="flex h-full flex-col gap-2.5">
        <div className="flex items-center gap-2 rounded-2xl border border-[#e5e5ea] bg-white px-4 py-2.5 shadow-sm">
          <span className="h-3 w-3 flex-shrink-0 rounded-full bg-[#ff9f0a]" />
          <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Яндекс Музыка — аудитория</h2>
        </div>
        {genderData.length > 0 && renderBarSection('Пол', genderData)}
        {ageData.length > 0 && renderBarSection('Возраст', ageData)}
      </div>
    )
  }

  const renderMobileCitiesScene = () => {
    const cities = audience?.cities ?? []
    const maxListeners = cities.length > 0 ? cities[0].listeners : 1

    return (
      <div className="flex h-full flex-col gap-2.5">
        <div className="flex items-center justify-between rounded-2xl border border-[#e5e5ea] bg-white px-4 py-3 shadow-sm">
          <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Топ городов</h2>
          <span className="text-[12px] text-[#8e8e93]">топ {Math.min(cities.length, 10)}</span>
        </div>

        <div className="flex flex-1 flex-col justify-center rounded-2xl border border-[#e5e5ea] bg-white px-4 py-3 shadow-sm">
          <div className="space-y-3">
            {cities.slice(0, 10).map(city => (
              <div key={city.rank}>
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[12px] font-semibold text-[#8e8e93]">{city.rank}</span>
                    <span className="text-[14px] font-semibold text-[#1d1d1f]">{city.city}</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-[13px] font-medium text-[#1d1d1f]">{city.listeners.toLocaleString('ru')}</span>
                    <span className="w-[40px] text-right text-[12px] text-[#8e8e93]">{city.completion.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="mt-1 h-[6px] overflow-hidden rounded-full bg-[#f0f0f0]">
                  <div
                    className="h-full rounded-full bg-[#ff9f0a]"
                    style={{ width: `${(city.listeners / maxListeners) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDashboardSceneIndex(0)}
          className="w-full rounded-2xl border border-[#e5e5ea] bg-white px-4 py-3 text-[13px] font-medium text-[#7b57c8] shadow-sm"
        >
          Вернуться в начало
        </button>
      </div>
    )
  }

  const renderMobileScene = (sceneId: string) => {
    switch (sceneId) {
      case 'overview':
        return renderMobileOverviewScene()
      case 'summary':
        return renderMobileSummaryScene()
      case 'charts':
        return renderMobileChartsScene()
      case 'ai':
        return renderMobileAiScene()
      case 'episodes':
        return renderMobileEpisodesScene()
      case 'episode-detail':
        return selectedEpisode ? renderMobileEpisodeDetailScene() : renderMobileEpisodesScene()
      case 'audience':
        return audience ? renderMobileAudienceScene() : null
      case 'cities':
        return audience ? renderMobileCitiesScene() : null
      default:
        return null
    }
  }

  if (!podcast) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-[#6e6e73]">Подкаст не найден</p>
        <button onClick={() => router.push('/')} className="mt-4 text-[#b150e2] text-sm hover:underline">На главную</button>
      </main>
    )
  }

  const mobileDashboardRenderScenes = selectedEpisode
    ? mobileDashboardScenes.map(scene => (
        scene.id === 'episodes'
          ? { ...scene, id: 'episode-detail', label: 'Эпизод' }
          : scene
      ))
    : mobileDashboardScenes
  const dashboardRenderTotalScenes = mobileDashboardRenderScenes.length

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <div
        className="md:hidden mobile-viewport-shell bg-[#f5f5f7] print:hidden"
        onTouchStart={handleMobileTouchStart}
        onTouchEnd={handleMobileTouchEnd}
        style={{ touchAction: 'manipulation', height: mobileViewportHeight || undefined }}
      >
        <div
          ref={mobileChromeRef}
          className="shrink-0 border-b border-[#e8e8ed] bg-white/92 backdrop-blur-md"
        >
          <div
            className="px-4 pb-3"
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
          >
            {isOverviewScene ? (
              <>
                <div className="flex items-center justify-between">
                  <button onClick={() => router.push('/')} className="text-[#b150e2] text-[14px] font-medium hover:opacity-70 transition-opacity">
                    ← Назад
                  </button>
                  {isDemo && (
                    <span className="rounded-md border border-[#b150e2]/20 bg-[#b150e2]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#b150e2]">
                      ДЕМО
                    </span>
                  )}
                </div>
                <div className="mt-2.5 flex items-center gap-3">
                  {podcastImageUrl && (
                    <SafePodcastImage src={podcastImageUrl} alt={podcastTitle} width={36} height={36} className="rounded-xl object-cover shadow-sm" />
                  )}
                  <div className="min-w-0 flex-1">
                    <h1 className="truncate text-[16px] font-semibold text-[#1d1d1f]">{podcastTitle}</h1>
                    <p className="mt-0.5 text-[12px] text-[#6e6e73]">{episodes.length} эпизодов</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <button onClick={() => router.push('/')} className="text-[#b150e2] text-[13px] font-medium hover:opacity-70 transition-opacity">
                  ← Назад
                </button>
                <div className="min-w-0 flex-1 text-center">
                  <p className="truncate text-[14px] font-semibold text-[#1d1d1f]">{selectedEpisode ? 'Детали эпизода' : podcastTitle}</p>
                </div>
                <div className="w-[56px]" />
              </div>
            )}

            {episodes.length > 0 && (
              <div className={`${isOverviewScene ? 'mt-4' : 'mt-3'} flex justify-center`}>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f5f7] px-3 py-2 shadow-[inset_0_0_0_1px_rgba(229,229,234,1)]">
                  {mobileDashboardRenderScenes.map((scene, index) => (
                    <span
                      key={scene.id}
                      className={[
                        'block h-1.5 rounded-full transition-all duration-300',
                        activeDashboardSceneIndex === index ? 'w-10 bg-[#b150e2]' : 'w-5 bg-[#d8d8dd]',
                      ].join(' ')}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="relative overflow-hidden" style={{ height: mobileSceneViewportHeight || undefined }}>
          {episodes.length === 0 ? (
            <div className="px-4 py-6">
              <div className="rounded-2xl border border-[#e5e5ea] bg-white px-6 py-12 text-center shadow-sm">
                <p className="text-[15px] text-[#6e6e73]">Данных пока нет</p>
                <button
                  onClick={() => router.push(`/${podcastId}/setup`)}
                  className={`${getCtaClasses({ tone: 'primary', fullWidth: true })} mt-4`}
                >
                  Загрузить CSV
                </button>
              </div>
            </div>
          ) : (
            <div
              className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                height: mobileSceneViewportHeight > 0 ? mobileSceneViewportHeight * dashboardRenderTotalScenes : undefined,
                transform: mobileSceneViewportHeight > 0
                  ? `translateY(-${activeDashboardSceneIndex * mobileSceneViewportHeight}px)`
                  : `translateY(-${activeDashboardSceneIndex * 100}%)`,
              }}
            >
              {mobileDashboardRenderScenes.map((scene, index) => (
                <section
                  key={scene.id}
                  className="shrink-0 px-4 py-3"
                  style={{ height: mobileSceneViewportHeight || undefined }}
                >
                  <div
                    ref={element => { mobileSceneContentRefs.current[index] = element }}
                    className={[
                      'h-full overscroll-contain pb-[max(env(safe-area-inset-bottom),12px)]',
                      scene.id === 'overview' || scene.id === 'episodes' || scene.id === 'episode-detail' || (scene.id === 'cities' && citiesExpanded)
                        ? 'overflow-y-auto'
                        : 'overflow-hidden',
                    ].join(' ')}
                  >
                    {renderMobileScene(scene.id)}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="hidden md:block print:!block">
        <div className="bg-white border-b border-[#e5e5ea] print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-start sm:items-center gap-3">
            <button onClick={() => router.push('/')} className="text-[#b150e2] text-[14px] font-medium hover:opacity-70 transition-opacity flex-shrink-0">
              ← Назад
            </button>
            {podcastImageUrl && (
              <SafePodcastImage src={podcastImageUrl} alt={podcastTitle} width={36} height={36} className="rounded-xl object-cover shadow-sm flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0 basis-[calc(100%-52px)] sm:basis-auto">
              <div className="flex items-center gap-2">
                <h1 className="text-[15px] sm:text-[17px] font-semibold text-[#1d1d1f] truncate">{podcastTitle}</h1>
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
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              {episodes.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 sm:flex-none">
                  <button
                    onClick={handlePrintPdf}
                    className={`${getCtaClasses({ tone: 'dark', size: 'compact' })} flex-1 sm:flex-none`}
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
                className={`${getCtaClasses({ tone: 'secondary', size: 'compact' })} flex-1 text-[#6e6e73] sm:flex-none`}
              >
                Сравнить
              </button>
              <button
                onClick={() => router.push(`/${podcastId}/setup`)}
                className={`${getCtaClasses({ tone: 'secondary', size: 'compact' })} flex-1 sm:flex-none`}
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
              <StatCards episodes={episodes} rawPlays={rawPlays} platformMeta={statCardMeta} />
              <TrendChart episodes={episodes} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 print:grid-cols-3 print:gap-3">
                <div className="md:col-span-1 print:col-span-1">
                  <PlatformChart episodes={episodes} rawPlays={rawPlays} />
                </div>
                <div className="md:col-span-2 print:col-span-2">
                  <AIInsights
                    episodes={episodes}
                    podcastTitle={podcastTitle}
                    initialInsights={DEMO_INSIGHTS_MAP[podcastId]}
                  />
                </div>
              </div>
              <EpisodeTable episodes={episodes} />
              {audience && (
                <YandexAudienceSection audience={audience} />
              )}
            </>
          )}
        </main>
      </div>

      {episodes.length > 0 && (
        <div className="print-only print-report-root">
          <PrintPage
            title={podcastTitle}
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
                <PrintPlatformChart episodes={episodes} rawPlays={rawPlays} />
              </div>
            </div>
          </PrintPage>

          <PrintPage
            title={podcastTitle}
            exportDate={exportDate}
            platformLabels={activePlatformLabels}
            last={!audience}
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

          {audience && (
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
      )}
    </div>
  )
}
