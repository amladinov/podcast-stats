'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { NormalizedEpisode, PlayRecord } from '@/types'

const PLATFORMS = [
  { key: 'mave' as const, label: 'Mave', color: '#b150e2' },
  { key: 'yandex' as const, label: 'Яндекс', color: '#ff9f0a' },
  { key: 'spotify' as const, label: 'Spotify', color: '#30d158' },
  { key: 'vk' as const, label: 'VK', color: '#0a84ff' },
]

interface Props {
  episodes: NormalizedEpisode[]
  rawPlays: PlayRecord[]
}

export function PlatformChart({ rawPlays }: Props) {
  const data = PLATFORMS
    .map(p => ({
      name: p.label,
      value: rawPlays.filter(r => r.platform === p.key).reduce((s, r) => s + r.plays, 0),
      color: p.color,
    }))
    .filter(d => d.value > 0)

  if (data.length === 0) return null

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#e5e5ea] shadow-sm h-full">
      <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Платформы</h2>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={70}
            paddingAngle={2}
            dataKey="value"
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
      <div className="space-y-2 mt-2">
        {data.map(d => (
          <div key={d.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
              <span className="text-[13px] text-[#1d1d1f]">{d.name}</span>
            </div>
            <span className="text-[13px] text-[#6e6e73]">{Math.round(d.value / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
