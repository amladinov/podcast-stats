'use client'

import { useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { NormalizedEpisode, Platform, PlayRecord } from '@/types'
import { getPlatformTotals } from '@/lib/podcastMetrics'
import { renderDonutShape } from '@/components/dashboard/donutActiveShape'

const PLATFORMS = [
  { key: 'mave' as const, label: 'Mave', color: '#b150e2' },
  { key: 'yandex' as const, label: 'Яндекс', color: '#ff9f0a' },
  { key: 'spotify' as const, label: 'Spotify', color: '#30d158' },
  { key: 'vk' as const, label: 'VK', color: '#0a84ff' },
  { key: 'youtube' as const, label: 'YouTube', color: '#ff0000' },
]

interface Props {
  episodes: NormalizedEpisode[]
  rawPlays: PlayRecord[]
  compact?: boolean
  enabledPlatforms?: Set<Platform>
}

export function PlatformChart({ episodes, rawPlays, compact = false, enabledPlatforms }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)
  const totals = getPlatformTotals(episodes, rawPlays, enabledPlatforms)

  const data = PLATFORMS
    .map(p => ({
      name: p.label,
      value: totals[p.key],
      color: p.color,
    }))
    .filter(d => d.value > 0)

  if (data.length === 0) return null

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className={`bg-white rounded-2xl border border-[#e5e5ea] shadow-sm print:shadow-none ${compact ? 'p-4' : 'p-5'}`}>
      <h2 className={`font-semibold text-[#1d1d1f] ${compact ? 'text-[14px] mb-3' : 'text-[15px] mb-4'}`}>Платформы</h2>
      <ResponsiveContainer width="100%" height={compact ? 146 : 180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={compact ? 38 : 45}
            outerRadius={compact ? 60 : 70}
            paddingAngle={2}
            dataKey="value"
            shape={props => renderDonutShape(props, props.index === activeIndex)}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(undefined)}
            onClick={(_, index) => setActiveIndex(index)}
            rootTabIndex={-1}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #e5e5ea', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
            formatter={(v: unknown) => [(v as number).toLocaleString('ru'), 'прослушиваний']}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className={`${compact ? 'space-y-1.5 mt-1' : 'space-y-2 mt-2'}`}>
        {data.map(d => (
          <div key={d.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
              <span className={`${compact ? 'text-[12px]' : 'text-[13px]'} text-[#1d1d1f]`}>{d.name}</span>
            </div>
            <span className={`${compact ? 'text-[12px]' : 'text-[13px]'} text-[#6e6e73]`}>{Math.round(d.value / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
