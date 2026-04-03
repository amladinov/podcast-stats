'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'
import type { NormalizedEpisode, PlayRecord, YandexAudience } from '@/types'
import { getPlatformTotals } from '@/lib/podcastMetrics'

const PLATFORM_CONFIG = [
  { key: 'mave' as const, label: 'Mave', color: '#b150e2' },
  { key: 'yandex' as const, label: 'Яндекс', color: '#ff9f0a' },
  { key: 'spotify' as const, label: 'Spotify', color: '#30d158' },
  { key: 'vk' as const, label: 'VK', color: '#0a84ff' },
  { key: 'youtube' as const, label: 'YouTube', color: '#ff0000' },
]

const GENDER_COLORS: Record<string, string> = {
  'Женщины': '#ff6b9d',
  'Мужчины': '#0a84ff',
  'Не определён': '#aeaeb2',
}

const AGE_COLORS = ['#b150e2', '#0a84ff', '#ff9f0a', '#30d158', '#ff6b9d', '#ff453a', '#aeaeb2']

export function PrintTrendChart({ episodes }: { episodes: NormalizedEpisode[] }) {
  const monthMap = new Map<string, number>()
  for (const episode of episodes) {
    for (const { date, plays } of episode.timeline) {
      const month = date.slice(0, 7)
      monthMap.set(month, (monthMap.get(month) ?? 0) + plays)
    }
  }

  const data = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, plays]) => ({
      month: new Date(month + '-01').toLocaleDateString('ru', { month: 'short', year: '2-digit' }),
      plays,
    }))

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#e5e5ea]">
      <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-5">Динамика прослушиваний</h2>
      {data.length === 0 ? (
        <p className="text-[#8e8e93] text-[13px]">Нет данных для графика. Загрузи CSV от Mave.</p>
      ) : (
        <AreaChart width={700} height={210} data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="printPlaysGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#b150e2" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#b150e2" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: '#8e8e93', fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#8e8e93', fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
          <Area
            type="monotone"
            dataKey="plays"
            stroke="#b150e2"
            strokeWidth={2}
            fill="url(#printPlaysGrad)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      )}
    </div>
  )
}

export function PrintPlatformChart({
  episodes,
  rawPlays,
}: {
  episodes: NormalizedEpisode[]
  rawPlays: PlayRecord[]
}) {
  const totals = getPlatformTotals(episodes, rawPlays)
  const data = PLATFORM_CONFIG
    .map(platform => ({
      name: platform.label,
      value: totals[platform.key],
      color: platform.color,
    }))
    .filter(item => item.value > 0)

  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#e5e5ea] h-full">
      <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Платформы</h2>
      {data.length === 0 ? (
        <p className="text-[#8e8e93] text-[13px]">Нет данных по платформам.</p>
      ) : (
        <>
          <div className="flex justify-center">
            <PieChart width={220} height={180}>
              <Pie
                data={data}
                cx={110}
                cy={90}
                innerRadius={44}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                isAnimationActive={false}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </div>
          <div className="space-y-2 mt-2">
            {data.map(item => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-[13px] text-[#1d1d1f]">{item.name}</span>
                </div>
                <span className="text-[13px] text-[#6e6e73]">
                  {total > 0 ? Math.round(item.value / total * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function PrintAudienceDonut({
  title,
  data,
}: {
  title: string
  data: Array<{ name: string; value: number; color: string }>
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  if (total === 0) return null

  return (
    <div>
      <h3 className="text-[13px] font-medium text-[#6e6e73] mb-3 uppercase tracking-wide">{title}</h3>
      <div className="flex justify-center">
        <PieChart width={220} height={170}>
          <Pie
            data={data}
            cx={110}
            cy={82}
            innerRadius={42}
            outerRadius={66}
            paddingAngle={2}
            dataKey="value"
            isAnimationActive={false}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </div>
      <div className="space-y-2 mt-1">
        {data.map(item => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
              <span className="text-[13px] text-[#1d1d1f]">{item.name}</span>
            </div>
            <span className="text-[13px] text-[#6e6e73]">{Math.round(item.value / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PrintYandexAudienceSection({ audience }: { audience: YandexAudience }) {
  const { gender, age, cities } = audience
  const hasAny = gender || age || cities
  if (!hasAny) return null

  const genderData = gender
    ? [
        { name: 'Женщины', value: gender.female, color: GENDER_COLORS['Женщины'] },
        { name: 'Мужчины', value: gender.male, color: GENDER_COLORS['Мужчины'] },
        ...(gender.unknown > 0 ? [{ name: 'Не определён', value: gender.unknown, color: GENDER_COLORS['Не определён'] }] : []),
      ].filter(item => item.value > 0)
    : []

  const ageData = age
    ? age.map((item, index) => ({
        name: item.range,
        value: item.count,
        color: AGE_COLORS[index % AGE_COLORS.length],
      })).filter(item => item.value > 0)
    : []

  return (
    <div className="bg-white rounded-2xl border border-[#e5e5ea] p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: '#ff9f0a' }} />
        <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Яндекс Музыка — аудитория</h2>
      </div>

      <div className="space-y-6">
        {(genderData.length > 0 || ageData.length > 0) && (
          <div className="grid grid-cols-2 gap-6">
            {genderData.length > 0 && <PrintAudienceDonut title="Пол" data={genderData} />}
            {ageData.length > 0 && <PrintAudienceDonut title="Возраст" data={ageData} />}
          </div>
        )}

        {cities && cities.length > 0 && (
          <div>
            <h3 className="text-[13px] font-medium text-[#6e6e73] mb-3 uppercase tracking-wide">Топ городов</h3>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[#aeaeb2] text-[11px] uppercase tracking-wide">
                  <th className="text-left pb-2 pr-4 font-medium">#</th>
                  <th className="text-left pb-2 pr-4 font-medium">Город</th>
                  <th className="text-right pb-2 pr-4 font-medium">Старты</th>
                  <th className="text-right pb-2 pr-4 font-medium">Слушатели</th>
                  <th className="text-right pb-2 font-medium">% дослуш.</th>
                </tr>
              </thead>
              <tbody>
                {cities.slice(0, 10).map(city => (
                  <tr key={city.rank} className="border-t border-[#f5f5f7]">
                    <td className="py-2 pr-4 text-[#aeaeb2]">{city.rank}</td>
                    <td className="py-2 pr-4 text-[#1d1d1f] font-medium">{city.city}</td>
                    <td className="py-2 pr-4 text-right text-[#3d3d3f]">{city.starts.toLocaleString('ru')}</td>
                    <td className="py-2 pr-4 text-right text-[#3d3d3f]">{city.listeners.toLocaleString('ru')}</td>
                    <td className="py-2 text-right text-[#3d3d3f]">{city.completion.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
