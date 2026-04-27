'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { NormalizedEpisode } from '@/types'

interface Props {
  episodes: NormalizedEpisode[]
  compact?: boolean
}

export function TrendChart({ episodes, compact = false }: Props) {
  const monthMap = new Map<string, number>()
  for (const ep of episodes) {
    for (const { date, plays } of ep.timeline) {
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

  if (data.length === 0) {
    return (
      <div className={`bg-white rounded-2xl border border-[#e5e5ea] shadow-sm text-center print:shadow-none print:break-inside-avoid-page ${compact ? 'p-4 mb-0' : 'p-6 mb-4'}`}>
        <p className="text-[#aeaeb2] text-[14px]">Нет данных для графика. Загрузи CSV от Mave.</p>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-2xl border border-[#e5e5ea] shadow-sm print:shadow-none ${compact ? 'p-4 mb-0' : 'p-6 mb-4 print:mb-3'}`}>
      <h2 className={`font-semibold text-[#1d1d1f] ${compact ? 'text-[14px] mb-3' : 'text-[15px] mb-5'}`}>Динамика прослушиваний</h2>
      <ResponsiveContainer width="100%" height={compact ? 128 : 170}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="playsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#b150e2" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#b150e2" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: '#aeaeb2', fontSize: compact ? 10 : 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: '#aeaeb2', fontSize: compact ? 10 : 11 }}
            tickLine={false}
            axisLine={false}
            width={compact ? 34 : 40}
          />
          <Tooltip
            cursor={{
              stroke: '#d1d1d6',
              strokeWidth: 1,
              strokeDasharray: '4 4',
            }}
            contentStyle={{ background: '#fff', border: '1px solid #e5e5ea', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
            labelStyle={{ color: '#1d1d1f', fontSize: 12, fontWeight: 600 }}
            itemStyle={{ color: '#b150e2' }}
            formatter={(v: unknown) => [(v as number).toLocaleString('ru'), 'прослушиваний']}
          />
          <Area
            type="monotone"
            dataKey="plays"
            stroke="#b150e2"
            strokeWidth={2}
            fill="url(#playsGrad)"
            dot={false}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
