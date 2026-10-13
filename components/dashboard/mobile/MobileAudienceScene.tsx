'use client'

import type { ChartDatum } from '@/lib/dashboardMetrics'

interface Props {
  genderData: ChartDatum[]
  ageData: ChartDatum[]
}

function BarSection({ title, data }: { title: string; data: ChartDatum[] }) {
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

export function MobileAudienceScene({ genderData, ageData }: Props) {
  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="flex items-center gap-2 rounded-2xl border border-[#e5e5ea] bg-white px-4 py-2.5 shadow-sm">
        <span className="h-3 w-3 flex-shrink-0 rounded-full bg-[#ff9f0a]" />
        <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Яндекс Музыка — аудитория</h2>
      </div>
      {genderData.length > 0 && <BarSection title="Пол" data={genderData} />}
      {ageData.length > 0 && <BarSection title="Возраст" data={ageData} />}
    </div>
  )
}
