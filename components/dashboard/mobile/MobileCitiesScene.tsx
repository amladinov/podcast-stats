'use client'

import type { YandexAudience } from '@/types'

type YandexCity = NonNullable<YandexAudience['cities']>[number]

interface Props {
  cities: YandexCity[]
  onBackToStart: () => void
}

export function MobileCitiesScene({ cities, onBackToStart }: Props) {
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
        onClick={onBackToStart}
        className="w-full rounded-2xl border border-[#e5e5ea] bg-white px-4 py-3 text-[13px] font-medium text-[#7b57c8] shadow-sm"
      >
        Вернуться в начало
      </button>
    </div>
  )
}
