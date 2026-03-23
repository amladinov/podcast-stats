'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { usePodcastStore } from '@/lib/store'
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
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { loadDemo(); router.push('/compare') }}
              className="bg-[#b150e2] hover:bg-[#9a3fd1] text-white text-[14px] font-medium px-5 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              Смотреть демо →
            </button>
            <button
              onClick={() => router.push('/')}
              className="bg-white hover:bg-[#f0f0f5] text-[#1d1d1f] text-[14px] font-medium px-5 py-2.5 rounded-xl transition-colors border border-[#e5e5ea]"
            >
              На главную
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Build platform bar chart data
  const platforms = ['Mave', 'Яндекс', 'Spotify', 'VK']
  const platformKeys = ['mave', 'yandex', 'spotify', 'vk'] as const

  const barChartData = platforms.map((name, pi) => {
    const key = platformKeys[pi]
    const entry: Record<string, string | number> = { platform: name }
    podcastsToShow.forEach(p => {
      const total = p.normalized.reduce((sum, ep) => sum + ep.plays[key], 0)
      entry[p.id] = total
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
            <div className="flex flex-wrap gap-2">
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
                      ? <Image src={p.imageUrl} alt="" width={20} height={20} className="rounded-md object-cover flex-shrink-0" />
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
          {podcastsToShow.map((p, i) => {
            const totalPlays = p.normalized.reduce((sum, ep) => sum + ep.plays.total, 0)
            const maveTotal = p.normalized.reduce((sum, ep) => sum + ep.plays.mave, 0)
            const yandexTotal = p.normalized.reduce((sum, ep) => sum + ep.plays.yandex, 0)
            const spotifyTotal = p.normalized.reduce((sum, ep) => sum + ep.plays.spotify, 0)
            const vkTotal = p.normalized.reduce((sum, ep) => sum + ep.plays.vk, 0)

            const pctMave    = totalPlays > 0 ? Math.round(maveTotal    / totalPlays * 100) : 0
            const pctYandex  = totalPlays > 0 ? Math.round(yandexTotal  / totalPlays * 100) : 0
            const pctSpotify = totalPlays > 0 ? Math.round(spotifyTotal / totalPlays * 100) : 0
            const pctVk      = totalPlays > 0 ? Math.round(vkTotal      / totalPlays * 100) : 0

            const color = PODCAST_COLORS[i % PODCAST_COLORS.length]

            return (
              <button
                key={p.id}
                onClick={() => router.push(`/${p.id}/dashboard`)}
                className="bg-white rounded-2xl p-5 border border-[#e5e5ea] shadow-sm text-left hover:border-[#b150e2]/50 hover:shadow-md hover:scale-[1.01] transition-all duration-200"
              >
                <div className="flex items-center gap-3 mb-4">
                  {p.imageUrl
                    ? (
                      <Image src={p.imageUrl} alt={p.title} width={48} height={48} className="rounded-xl object-cover flex-shrink-0 shadow-sm" />
                    )
                    : (
                      <div className="w-12 h-12 rounded-xl flex-shrink-0" style={{ backgroundColor: color + '33' }} />
                    )
                  }
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1d1d1f] text-[14px] leading-tight line-clamp-2">{p.title}</p>
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
                  ].map(({ label, pct }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-[11px] text-[#6e6e73] w-14 flex-shrink-0">{label}</span>
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
        <div className="bg-white rounded-2xl p-6 border border-[#e5e5ea] shadow-sm">
          <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-6">По платформам</h2>
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
                  const p = podcastsToShow.find(pod => pod.id === value)
                  return p ? truncate(p.title, 15) : value
                }}
              />
              {podcastsToShow.map((p, i) => (
                <Bar
                  key={p.id}
                  dataKey={p.id}
                  name={p.id}
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
            {podcastsToShow.map((p, i) => {
              const color = PODCAST_COLORS[i % PODCAST_COLORS.length]
              const top5 = [...p.normalized]
                .sort((a, b) => b.plays.total - a.plays.total)
                .slice(0, 5)

              return (
                <div key={p.id} className="bg-white rounded-2xl p-5 border border-[#e5e5ea] shadow-sm">
                  <button
                    onClick={() => router.push(`/${p.id}/dashboard`)}
                    className="text-[13px] font-semibold text-[#1d1d1f] mb-4 truncate w-full text-left hover:text-[#b150e2] transition-colors"
                  >
                    {p.title}
                  </button>
                  <div className="space-y-3">
                    {top5.map((ep, rank) => (
                      <button
                        key={ep.id}
                        onClick={() => router.push(`/${p.id}/dashboard`)}
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
                            {formatNumber(ep.plays.total)}
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
