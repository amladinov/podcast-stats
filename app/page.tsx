'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { usePodcastStore } from '@/lib/store'
import type { RSSEpisode } from '@/types'

export default function HomePage() {
  const router = useRouter()
  const { podcasts, addPodcast, removePodcast, loadDemo } = usePodcastStore()
  const [rssUrl, setRssUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd() {
    if (!rssUrl.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/rss?url=${encodeURIComponent(rssUrl.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки RSS')
      const id = addPodcast(rssUrl.trim(), data.title, data.description, data.imageUrl, data.episodes as RSSEpisode[])
      setRssUrl('')
      router.push(`/${id}/setup`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 sm:py-16">
      {/* Hero */}
      <div className="mb-12 text-center pt-6">
        <h1 className="text-[30px] sm:text-[38px] font-bold text-[#1d1d1f] tracking-tight mb-3 leading-tight">
          Полная статистика подкаста<br className="hidden sm:block" /> — в одном месте
        </h1>
        <p className="text-[#6e6e73] text-[16px] mb-8 max-w-md mx-auto">
          Подключи RSS и загрузи CSV с Яндекс Музыки, Spotify и ВКонтакте
        </p>

        {/* 3 steps */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#b150e2] text-white text-[12px] font-bold flex items-center justify-center flex-shrink-0">1</span>
            <span className="text-[#1d1d1f] text-[14px] font-medium">RSS-ссылка</span>
          </div>
          <span className="text-[#aeaeb2] text-[16px] font-light select-none">→</span>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#b150e2] text-white text-[12px] font-bold flex items-center justify-center flex-shrink-0">2</span>
            <span className="text-[#1d1d1f] text-[14px] font-medium">CSV файлы</span>
          </div>
          <span className="text-[#aeaeb2] text-[16px] font-light select-none">→</span>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#b150e2] text-white text-[12px] font-bold flex items-center justify-center flex-shrink-0">3</span>
            <span className="text-[#1d1d1f] text-[14px] font-medium">Аналитика + AI</span>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => { loadDemo(); router.push('/demo/dashboard') }}
            className="inline-flex items-center gap-2 bg-[#b150e2] hover:bg-[#9a3fd1] text-white text-[14px] font-medium px-5 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            Смотреть демо →
          </button>
          <button
            onClick={() => { loadDemo(); router.push('/compare') }}
            className="inline-flex items-center gap-2 bg-white hover:bg-[#f0f0f5] text-[#b150e2] text-[14px] font-medium px-5 py-2.5 rounded-xl transition-colors border border-[#e5e5ea]"
          >
            Сравнить подкасты
          </button>
        </div>
      </div>

      {/* Add podcast card */}
      <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-[#e5e5ea]">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Добавить подкаст</h2>
        <div className="flex gap-2">
          <input
            type="url"
            value={rssUrl}
            onChange={e => setRssUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="RSS-ссылка подкаста"
            className="flex-1 bg-[#f5f5f7] border border-[#e5e5ea] rounded-xl px-4 py-2.5 text-[14px] text-[#1d1d1f] placeholder-[#aeaeb2] focus:outline-none focus:border-[#b150e2] focus:ring-2 focus:ring-[#b150e2]/20 transition-all"
          />
          <button
            onClick={handleAdd}
            disabled={loading || !rssUrl.trim()}
            className="bg-[#b150e2] hover:bg-[#9a3fd1] disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-[14px] font-medium transition-colors whitespace-nowrap"
          >
            {loading ? 'Загружаю...' : 'Добавить'}
          </button>
        </div>
        {error && <p className="text-red-500 text-[13px] mt-3">{error}</p>}
      </div>

      {/* Podcast list */}
      {podcasts.length > 0 && (
        <div className="space-y-2">
          {podcasts.map(p => (
            <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border border-[#e5e5ea] hover:border-[#b150e2]/40 hover:shadow-md hover:scale-[1.01] transition-all duration-200">
              {/* Top row: image + title + delete */}
              <div className="flex items-center gap-3 mb-3">
                {p.imageUrl
                  ? <Image src={p.imageUrl} alt={p.title} width={48} height={48} className="rounded-xl object-cover flex-shrink-0 shadow-sm" />
                  : <div className="w-12 h-12 rounded-xl bg-[#f5f5f7] flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1d1d1f] text-[15px] truncate">{p.title}</p>
                  <p className="text-[#6e6e73] text-[13px] mt-0.5 truncate">
                    {p.episodes.length} эп.
                    {p.uploadedPlatforms.length > 0 && (
                      <span className="ml-1.5 text-[#b150e2]">· {p.uploadedPlatforms.map(u => u.platform).join(', ')}</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm(`Удалить «${p.title}»? Это действие нельзя отменить.`)) {
                      removePodcast(p.id)
                    }
                  }}
                  className="text-[#aeaeb2] hover:text-red-500 p-1.5 transition-colors flex-shrink-0"
                >
                  ✕
                </button>
              </div>
              {/* Bottom row: action buttons */}
              <div className="flex gap-3">
                {p.uploadedPlatforms.length > 0 && (
                  <button onClick={() => router.push(`/${p.id}/dashboard`)} className="text-[13px] bg-[#b150e2] hover:bg-[#9a3fd1] text-white px-4 py-1.5 rounded-lg transition-colors font-medium">
                    Дашборд
                  </button>
                )}
                <button onClick={() => router.push(`/${p.id}/setup`)} className="text-[13px] bg-[#f5f5f7] hover:bg-[#e5e5ea] text-[#1d1d1f] px-4 py-1.5 rounded-lg transition-colors">
                  + Данные
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {podcasts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-[#d2d2d7]">
          <div className="text-4xl mb-3">🎙️</div>
          <p className="text-[#6e6e73] text-[14px] mb-2">Добавь RSS-ссылку подкаста, чтобы начать</p>
          <p className="text-[#aeaeb2] text-[12px]">Например: <span className="font-mono text-[#b150e2]">https://mave.digital/ep/sovet-direktorov.rss</span></p>
        </div>
      )}
    </main>
  )
}
