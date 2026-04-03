'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { YandexAudience } from '@/types'

const YANDEX_COLOR = '#ff9f0a'

const GENDER_COLORS: Record<string, string> = {
  'Женщины': '#ff6b9d',
  'Мужчины': '#0a84ff',
  'Не определён': '#aeaeb2',
}

const AGE_COLORS = ['#b150e2', '#0a84ff', '#ff9f0a', '#30d158', '#ff6b9d', '#ff453a', '#aeaeb2']

function DonutSection({ title, data }: { title: string; data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null

  return (
    <div>
      <h3 className="text-[13px] font-medium text-[#6e6e73] mb-3 uppercase tracking-wide">{title}</h3>
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
            activeShape={false}
            rootTabIndex={-1}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #e5e5ea', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
            formatter={(v: unknown, _name: unknown, props: { payload?: { name: string } }) => {
              const pct = total > 0 ? Math.round((v as number) / total * 100) : 0
              return [`${pct}%`, props.payload?.name ?? '']
            }}
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

export function YandexAudienceSection({ audience }: { audience: YandexAudience }) {
  const { gender, age, cities } = audience
  const hasAny = gender || age || cities

  if (!hasAny) return null

  const genderData = gender
    ? [
        { name: 'Женщины', value: gender.female, color: GENDER_COLORS['Женщины'] },
        { name: 'Мужчины', value: gender.male, color: GENDER_COLORS['Мужчины'] },
        ...(gender.unknown > 0 ? [{ name: 'Не определён', value: gender.unknown, color: GENDER_COLORS['Не определён'] }] : []),
      ].filter(d => d.value > 0)
    : []

  const ageData = age
    ? age.map((a, i) => ({ name: a.range, value: a.count, color: AGE_COLORS[i % AGE_COLORS.length] })).filter(d => d.value > 0)
    : []

  return (
    <div className="bg-white rounded-2xl border border-[#e5e5ea] shadow-sm p-5 mb-4 print:shadow-none print:break-inside-auto">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: YANDEX_COLOR }} />
        <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Яндекс Музыка — аудитория</h2>
      </div>

      <div className="space-y-6">
        {(genderData.length > 0 || ageData.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 print:grid-cols-2">
            {genderData.length > 0 && <DonutSection title="Пол" data={genderData} />}
            {ageData.length > 0 && <DonutSection title="Возраст" data={ageData} />}
          </div>
        )}

        {cities && cities.length > 0 && (
          <div className="print:break-inside-auto">
            <h3 className="text-[13px] font-medium text-[#6e6e73] mb-3 uppercase tracking-wide">Топ городов</h3>
            <div className="overflow-x-auto -mx-1 mt-1 print:overflow-visible">
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
                  {cities.slice(0, 10).map(c => (
                    <tr key={c.rank} className="border-t border-[#f5f5f7]">
                      <td className="py-2 pr-4 text-[#aeaeb2]">{c.rank}</td>
                      <td className="py-2 pr-4 text-[#1d1d1f] font-medium">{c.city}</td>
                      <td className="py-2 pr-4 text-right text-[#3d3d3f]">{c.starts.toLocaleString('ru')}</td>
                      <td className="py-2 pr-4 text-right text-[#3d3d3f]">{c.listeners.toLocaleString('ru')}</td>
                      <td className="py-2 text-right text-[#3d3d3f]">{c.completion.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
