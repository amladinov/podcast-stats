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
}

export function TrendChart({ episodes }: Props) {
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
      <div className="bg-white rounded-2xl p-6 mb-4 border border-[#e5e5ea] shadow-sm text-center">
        <p className="text-[#aeaeb2] text-[14px]">Нет данных для графика. Загрузи CSV от Mave.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-6 mb-4 border border-[#e5e5ea] shadow-sm">
      <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-5">Динамика прослушиваний</h2>
      <ResponsiveContainer width="100%" height={200}>
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
            tick={{ fill: '#aeaeb2', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: '#aeaeb2', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
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
            activeDot={{ r: 4, fill: '#b150e2', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
