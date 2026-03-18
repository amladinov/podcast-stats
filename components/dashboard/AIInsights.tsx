'use client'

import { useState } from 'react'
import type { NormalizedEpisode } from '@/types'

interface Props {
  episodes: NormalizedEpisode[]
  podcastTitle: string
}

export function AIInsights({ episodes, podcastTitle }: Props) {
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState('')
  const [error, setError] = useState('')

  async function analyze() {
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
    <div className="bg-white rounded-2xl p-5 border border-[#e5e5ea] shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f]">AI-аналитика</h2>
        <button
          onClick={analyze}
          disabled={loading}
          className="text-[13px] bg-[#b150e2] hover:bg-[#9a3fd1] disabled:opacity-40 text-white px-4 py-1.5 rounded-lg transition-colors font-medium"
        >
          {loading ? 'Анализирую...' : insights ? 'Обновить' : 'Анализировать'}
        </button>
      </div>

      {error && <p className="text-red-500 text-[13px] mb-2">{error}</p>}

      {!insights && !loading && (
        <p className="text-[#aeaeb2] text-[13px] leading-relaxed">
          Claude проанализирует данные и даст конкретные инсайты по-русски — какие эпизоды работают лучше и почему.
        </p>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-[#6e6e73] text-[13px]">
          <span className="animate-spin inline-block">⟳</span> Анализирую...
        </div>
      )}

      {insights && (
        <div className="text-[13px] text-[#1d1d1f] leading-[1.6] whitespace-pre-wrap overflow-y-auto flex-1">
          {insights}
        </div>
      )}
    </div>
  )
}
