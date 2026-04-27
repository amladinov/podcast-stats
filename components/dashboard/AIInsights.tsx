'use client'

import { useState } from 'react'
import type { NormalizedEpisode } from '@/types'

const AI_INSIGHTS_ENABLED = process.env.NEXT_PUBLIC_AI_INSIGHTS_ENABLED === 'true'

interface Props {
  episodes: NormalizedEpisode[]
  podcastTitle: string
  initialInsights?: string
  compact?: boolean
  filterActive?: boolean
  disabledPlatformLabels?: string[]
}

export function AIInsights({
  episodes,
  podcastTitle,
  initialInsights,
  filterActive = false,
  disabledPlatformLabels = [],
}: Props) {
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState(initialInsights ?? '')
  const [error, setError] = useState('')
  const hasPreviewInsights = !AI_INSIGHTS_ENABLED && Boolean(insights)
  const showFilterNotice = filterActive && disabledPlatformLabels.length > 0

  async function analyze() {
    if (!AI_INSIGHTS_ENABLED) return

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodes, podcastTitle }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      setInsights(data.insights)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#e5e5ea] shadow-sm h-full flex flex-col print:shadow-none">
      {showFilterNotice && (
        <p className="mb-3 rounded-xl border border-[#ffd8a8] bg-[#fff8ef] px-3 py-2 text-[12px] text-[#8a4f00]">
          AI-аналитика посчитана по всем источникам. Фильтр не учтён: {disabledPlatformLabels.join(', ')}.
        </p>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f]">AI-аналитика</h2>
        <button
          onClick={analyze}
          disabled={loading || !AI_INSIGHTS_ENABLED}
          className="text-[13px] bg-[#b150e2] hover:bg-[#9a3fd1] disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 sm:py-1.5 rounded-lg transition-colors font-medium w-full sm:w-auto print:hidden"
        >
          {loading ? 'Анализирую...' : AI_INSIGHTS_ENABLED ? (insights ? 'Обновить' : 'Анализировать') : 'Скоро'}
        </button>
      </div>

      {error && <p className="text-red-500 text-[13px] mb-2">{error}</p>}

      {!AI_INSIGHTS_ENABLED && !hasPreviewInsights && (
        <p className="text-[#aeaeb2] text-[13px] leading-relaxed">
          AI-аналитика скоро будет доступна в этой версии сервиса. Здесь появятся ключевые инсайты, аномалии и рекомендации по выпускам.
        </p>
      )}

      {!AI_INSIGHTS_ENABLED && !insights && (
        <p className="hidden print:block text-[#6e6e73] text-[13px] leading-relaxed">
          AI-анализ временно недоступен в публичной версии сервиса.
        </p>
      )}

      {!AI_INSIGHTS_ENABLED && insights && (
        <>
          <p className="text-[#6e6e73] text-[13px] leading-relaxed">
            В публичной версии AI-аналитика скоро будет доступна. Ниже показан пример того, как может выглядеть этот блок в продукте.
          </p>
          <div className="text-[13px] text-[#1d1d1f] leading-[1.6] overflow-y-auto flex-1 space-y-1 mt-3 print:overflow-visible">
            {insights.split('\n').map((line, i) => {
              if (!line.trim()) return <div key={i} className="h-1" />
              const parts = line.split(/\*\*(.*?)\*\*/g)
              return (
                <p key={i}>
                  {parts.map((part, j) =>
                    j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                  )}
                </p>
              )
            })}
          </div>
        </>
      )}

      {!insights && !loading && AI_INSIGHTS_ENABLED && (
        <p className="text-[#aeaeb2] text-[13px] leading-relaxed">
          Claude проанализирует данные и даст конкретные инсайты по-русски — какие эпизоды работают лучше и почему.
        </p>
      )}

      {loading && AI_INSIGHTS_ENABLED && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[#6e6e73] text-[13px]">
            <span className="animate-spin-smooth">⟳</span> Анализирую...
          </div>
          <p className="text-[11px] text-[#aeaeb2]">Анализ займёт ~10 секунд</p>
        </div>
      )}

      {insights && AI_INSIGHTS_ENABLED && (
        <div className="text-[13px] text-[#1d1d1f] leading-[1.6] overflow-y-auto flex-1 space-y-1 print:overflow-visible">
          {insights.split('\n').map((line, i) => {
            if (!line.trim()) return <div key={i} className="h-1" />
            const parts = line.split(/\*\*(.*?)\*\*/g)
            return (
              <p key={i}>
                {parts.map((part, j) =>
                  j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                )}
              </p>
            )
          })}
        </div>
      )}
    </div>
  )
}
