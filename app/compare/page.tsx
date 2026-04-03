'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SafePodcastImage } from '@/components/SafePodcastImage'
import { usePodcastStore } from '@/lib/store'
import { getPlatformTotals, getTotalPlays } from '@/lib/podcastMetrics'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const PODCAST_COLORS = ['#b150e2', '#ff9f0a', '#0a84ff', '#30d158', '#ff453a', '#64d2ff']
const MAX_COMPARE = 6

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return String(n)
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '...' : str
}

type ComparePodcastSummary = {
  id: string
  title: string
  imageUrl?: string
  totals: ReturnType<typeof getPlatformTotals>
  totalPlays: number
  top5: Array<{ id: string; title: string; total: number }>
}

export default function ComparePage() {
  const router = useRouter()
  const podcasts = usePodcastStore(s => s.podcasts)
  const loadDemo = usePodcastStore(s => s.loadDemo)

  const podcastsWithData = podcasts.filter(p => p.uploadedPlatforms.length > 0)

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(podcastsWithData.slice(0, MAX_COMPARE).map(p => p.id))
  )

  const needsSelection = podcastsWithData.length > MAX_COMPARE
  const podcastsToShow = needsSelection
    ? podcastsWithData.filter(p => selected.has(p.id))
    : podcastsWithData

  const summaries = useMemo<ComparePodcastSummary[]>(
    () => podcastsToShow.map(podcast => {
      const totals = getPlatformTotals(podcast.normalized, podcast.rawPlays)
      const totalPlays = getTotalPlays(podcast.normalized)
      const top5 = [...podcast.normalized]
        .sort((a, b) => b.plays.total - a.plays.total)
        .slice(0, 5)
        .map(episode => ({
          id: episode.id,
          title: episode.title,
          total: episode.plays.total,
        }))

      return {
        id: podcast.id,
        title: podcast.title,
        imageUrl: podcast.imageUrl,
        totals,
        totalPlays,
        top5,
      }
    }),
    [podcastsToShow]
  )

  function togglePodcast(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < MAX_COMPARE) {
        next.add(id)
      }
      return next
    })
  }

  if (podcastsWithData.length < 2) {
    return (
      <div className="min-h-screen bg-[#f5f5f7]">
        <div className="bg-white border-b border-[#e5e5ea]">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="text-[#b150e2] text-[14px] font-medium hover:opacity-70 transition-opacity"
            >
              &larr; Назад
            </button>
            <h1 className="text-[17px] font-semibold text-[#1d1d1f]">Сравнение подкастов</h1>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <div className="text-5xl mb-4">📊</div>
          <p className="text-[#1d1d1f] text-[17px] font-semibold mb-2">Нужно хотя бы 2 подкаста с данными</p>
          <p className="text-[#6e6e73] text-[14px] mb-6">
            Добавьте подкасты на главной и загрузите CSV-файлы статистики.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => { loadDemo(); router.push('/compare') }}
              className="bg-[#b150e2] hover:bg-[#9a3fd1] text-white text-[14px] font-medium px-5 py-2.5 rounded-xl transition-colors shadow-sm w-full sm:w-auto"
            >
              Смотреть демо →
            </button>
            <button
              onClick={() => router.push('/')}
              className="bg-white hover:bg-[#f0f0f5] text-[#1d1d1f] text-[14px] font-medium px-5 py-2.5 rounded-xl transition-colors border border-[#e5e5ea] w-full sm:w-auto"
            >
              На главную
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Build platform bar chart data
  const platforms = ['Mave', 'Яндекс', 'Spotify', 'VK', 'YouTube']
  const platformKeys = ['mave', 'yandex', 'spotify', 'vk', 'youtube'] as const

  const barChartData = platforms.map((name, pi) => {
    const key = platformKeys[pi]
    const entry: Record<string, string | number> = { platform: name }
    summaries.forEach(summary => {
      entry[summary.id] = summary.totals[key]
    })
    return entry
  })

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e5ea]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="text-[#b150e2] text-[14px] font-medium hover:opacity-70 transition-opacity"
          >
            &larr; Назад
          </button>
          <h1 className="text-[17px] font-semibold text-[#1d1d1f]">Сравнение подкастов</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-8">

        {/* Selection panel — only when >6 podcasts */}
        {needsSelection && (
          <div className="bg-white rounded-2xl p-5 border border-[#e5e5ea] shadow-sm">
            <p className="text-[14px] font-semibold text-[#1d1d1f] mb-1">Выберите до {MAX_COMPARE} подкастов для сравнения</p>
            <p className="text-[12px] text-[#aeaeb2] mb-4">Выбрано: {selected.size} из {MAX_COMPARE}</p>
            <div className="flex flex-wrap gap-3">
              {podcastsWithData.map(p => {
                const isSelected = selected.has(p.id)
                const isDisabled = !isSelected && selected.size >= MAX_COMPARE
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePodcast(p.id)}
                    disabled={isDisabled}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[13px] font-medium transition-all ${
                      isSelected
                        ? 'bg-[#b150e2]/10 border-[#b150e2]/40 text-[#b150e2]'
                        : isDisabled
                          ? 'bg-[#f5f5f7] border-[#e5e5ea] text-[#aeaeb2] opacity-50 cursor-not-allowed'
                          : 'bg-[#f5f5f7] border-[#e5e5ea] text-[#6e6e73] hover:border-[#b150e2]/30'
                    }`}
                  >
                    {p.imageUrl
                      ? <SafePodcastImage src={p.imageUrl} alt="" width={20} height={20} className="rounded-md object-cover flex-shrink-0" />
                      : <span className="w-5 h-5 rounded-md bg-[#e5e5ea] flex-shrink-0" />
                    }
                    <span className="max-w-[140px] truncate">{p.title}</span>
                    {isSelected && <span className="text-[10px]">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Podcast summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {summaries.map((summary, i) => {
            const { totals, totalPlays } = summary
            const maveTotal = totals.mave
            const yandexTotal = totals.yandex
            const spotifyTotal = totals.spotify
            const vkTotal = totals.vk
            const youtubeTotal = totals.youtube

            const pctMave    = totalPlays > 0 ? Math.round(maveTotal    / totalPlays * 100) : 0
            const pctYandex  = totalPlays > 0 ? Math.round(yandexTotal  / totalPlays * 100) : 0
            const pctSpotify = totalPlays > 0 ? Math.round(spotifyTotal / totalPlays * 100) : 0
            const pctVk      = totalPlays > 0 ? Math.round(vkTotal      / totalPlays * 100) : 0
            const pctYoutube = totalPlays > 0 ? Math.round(youtubeTotal / totalPlays * 100) : 0

            const color = PODCAST_COLORS[i % PODCAST_COLORS.length]

            return (
              <button
                key={summary.id}
                onClick={() => router.push(`/${summary.id}/dashboard`)}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e5e5ea] shadow-sm text-left hover:border-[#b150e2]/50 hover:shadow-md hover:scale-[1.01] transition-all duration-200"
              >
                <div className="flex items-center gap-3 mb-4">
                  {summary.imageUrl
                    ? (
                      <SafePodcastImage src={summary.imageUrl} alt={summary.title} width={48} height={48} className="rounded-xl object-cover flex-shrink-0 shadow-sm" />
                    )
                    : (
                      <div className="w-12 h-12 rounded-xl flex-shrink-0" style={{ backgroundColor: color + '33' }} />
                    )
                  }
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1d1d1f] text-[14px] leading-tight line-clamp-2">{summary.title}</p>
                  </div>
                </div>

                <div className="mb-1">
                  <span className="text-[28px] font-bold" style={{ color }}>{formatNumber(totalPlays)}</span>
                  <span className="text-[#6e6e73] text-[12px] ml-1">прослушиваний</span>
                </div>

                <div className="space-y-1 mt-3">
                  {[
                    { label: 'Mave',   pct: pctMave    },
                    { label: 'Яндекс', pct: pctYandex  },
                    { label: 'Spotify',pct: pctSpotify },
                    { label: 'VK',     pct: pctVk      },
                    { label: 'YouTube', pct: pctYoutube },
                  ].map(({ label, pct }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-[11px] text-[#6e6e73] w-16 sm:w-14 flex-shrink-0">{label}</span>
                      <div className="flex-1 bg-[#f5f5f7] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-[11px] text-[#aeaeb2] w-8 text-right">{pct}%</span>
                    </div>
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        {/* Bar chart by platform */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-[#e5e5ea] shadow-sm">
          <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4 sm:mb-6">По платформам</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barChartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f5" vertical={false} />
              <XAxis
                dataKey="platform"
                tick={{ fontSize: 12, fill: '#6e6e73' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#aeaeb2' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatNumber}
                width={48}
              />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [formatNumber(typeof value === 'number' ? value : 0)]}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #e5e5ea',
                  fontSize: 13,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                formatter={(value: string) => {
                  const summary = summaries.find(item => item.id === value)
                  return summary ? truncate(summary.title, 12) : value
                }}
              />
              {summaries.map((summary, i) => (
                <Bar
                  key={summary.id}
                  dataKey={summary.id}
                  name={summary.id}
                  fill={PODCAST_COLORS[i % PODCAST_COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top episodes */}
        <div>
          <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Топ эпизодов</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {summaries.map((summary, i) => {
              const color = PODCAST_COLORS[i % PODCAST_COLORS.length]

              return (
                <div key={summary.id} className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e5e5ea] shadow-sm">
                  <button
                    onClick={() => router.push(`/${summary.id}/dashboard`)}
                    className="text-[13px] font-semibold text-[#1d1d1f] mb-4 truncate w-full text-left hover:text-[#b150e2] transition-colors"
                  >
                    {summary.title}
                  </button>
                  <div className="space-y-4">
                    {summary.top5.map((ep, rank) => (
                      <button
                        key={ep.id}
                        onClick={() => router.push(`/${summary.id}/dashboard`)}
                        className="flex items-start gap-3 w-full text-left hover:opacity-70 transition-opacity"
                      >
                        <span
                          className="text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: color + '22', color }}
                        >
                          {rank + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-[#1d1d1f] leading-tight line-clamp-2">{truncate(ep.title, 50)}</p>
                          <p className="text-[11px] font-semibold mt-0.5" style={{ color }}>
                            {formatNumber(ep.total)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
