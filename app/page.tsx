'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SafePodcastImage } from '@/components/SafePodcastImage'
import { usePodcastStore } from '@/lib/store'
import { DEMO_IDS } from '@/lib/demoData'
import type { RSSEpisode } from '@/types'

export default function HomePage() {
  const router = useRouter()
  const podcasts = usePodcastStore(s => s.podcasts)
  const addPodcast = usePodcastStore(s => s.addPodcast)
  const removePodcast = usePodcastStore(s => s.removePodcast)
  const loadDemo = usePodcastStore(s => s.loadDemo)
  const [rssUrl, setRssUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [demoAnimating, setDemoAnimating] = useState(false)
  const canCompare = podcasts.filter(p => p.uploadedPlatforms.length > 0).length >= 2

  function handleDemoClick() {
    loadDemo()
    setDemoAnimating(true)
    setTimeout(() => router.push('/demo/dashboard'), 1200)
  }

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
    <>
    <main className="max-w-3xl mx-auto px-4 py-8 sm:py-16">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,244,255,0.92)_45%,rgba(247,249,255,0.94))] shadow-[0_16px_50px_rgba(29,29,31,0.08)] mb-10 sm:mb-12 pt-6 sm:pt-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-14 left-[-10%] h-44 w-44 rounded-full bg-[#b150e2]/18 blur-3xl" />
          <div className="absolute top-10 right-[-8%] h-52 w-52 rounded-full bg-[#0a84ff]/14 blur-3xl" />
          <div className="absolute bottom-[-4.5rem] left-1/2 h-36 w-64 -translate-x-1/2 rounded-full bg-[#ff9f0a]/14 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(177,80,226,0.4),transparent)]" />
        </div>

        <div className="relative text-center px-5 sm:px-8 pb-7 sm:pb-9">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-medium tracking-[0.12em] text-[#7b57c8] uppercase shadow-sm mb-4">
            Podcast Stats
          </div>
          <h1 className="text-[28px] sm:text-[42px] font-bold text-[#1d1d1f] tracking-tight mb-3 leading-[1.05]">
            Полная статистика подкаста
            <br className="hidden sm:block" /> в одном аккуратном дашборде
          </h1>
          <p className="text-[#4a4a52] text-[15px] sm:text-[17px] mb-7 sm:mb-8 max-w-xl mx-auto leading-relaxed">
            Подключи RSS, загрузи выгрузки платформ и собери Яндекс, Spotify, VK, Mave и YouTube в один понятный отчёт.
          </p>

          <div className="grid grid-cols-1 gap-3 justify-items-start sm:flex sm:items-center sm:justify-center sm:gap-4 mb-8 max-w-xs mx-auto sm:max-w-none">
            <div className="flex items-center justify-start gap-2">
              <span className="w-7 h-7 rounded-full bg-[#b150e2] text-white text-[12px] font-bold flex items-center justify-center flex-shrink-0">1</span>
              <span className="text-[#1d1d1f] text-[14px] font-medium">RSS-ссылка</span>
            </div>
            <span className="hidden sm:inline text-[#c3bdd2] text-[16px] font-light select-none">→</span>
            <div className="flex items-center justify-start gap-2">
              <span className="w-7 h-7 rounded-full bg-[#b150e2] text-white text-[12px] font-bold flex items-center justify-center flex-shrink-0">2</span>
              <span className="text-[#1d1d1f] text-[14px] font-medium">Данные платформ</span>
            </div>
            <span className="hidden sm:inline text-[#c3bdd2] text-[16px] font-light select-none">→</span>
            <div className="flex items-center justify-start gap-2">
              <span className="w-7 h-7 rounded-full bg-[#b150e2] text-white text-[12px] font-bold flex items-center justify-center flex-shrink-0">3</span>
              <span className="text-[#1d1d1f] text-[14px] font-medium">Аналитика + AI</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
            <button
              onClick={handleDemoClick}
              disabled={demoAnimating}
              className="inline-flex items-center justify-center gap-2 bg-[#b150e2] hover:bg-[#9a3fd1] text-white text-[14px] font-medium px-5 py-3 sm:py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-70 disabled:cursor-default w-full sm:w-auto"
            >
              {demoAnimating ? 'Открываю...' : 'Смотреть демо →'}
            </button>
          </div>
          {canCompare ? (
            <div className="mt-3 flex justify-center">
              <button
                onClick={() => router.push('/compare')}
                className="inline-flex items-center justify-center gap-2 bg-white/85 hover:bg-white text-[#7b57c8] text-[14px] font-medium px-5 py-3 sm:py-2.5 rounded-xl transition-colors border border-white/80 shadow-sm w-full sm:w-auto"
              >
                Сравнить подкасты
              </button>
            </div>
          ) : (
            <p className="mt-3 text-[#6e6e73] text-[13px] max-w-sm mx-auto">
              Сравнение станет доступно, когда появятся хотя бы 2 подкаста с данными.
            </p>
          )}
        </div>
      </div>

      {/* Add podcast card */}
      <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-[#e5e5ea]">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Добавить подкаст</h2>
        <div className="flex flex-col sm:flex-row gap-2">
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
            className="bg-[#b150e2] hover:bg-[#9a3fd1] disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-[14px] font-medium transition-colors whitespace-nowrap w-full sm:w-auto"
          >
            {loading ? 'Загружаю...' : 'Добавить'}
          </button>
        </div>
        {error && <p className="text-red-500 text-[13px] mt-3">{error}</p>}
      </div>

      {/* Podcast list */}
      {podcasts.length > 0 && (
        <div className="space-y-2">
          {podcasts.map((p, index) => (
            <div
              key={p.id}
              className={`bg-white rounded-2xl p-4 shadow-sm border border-[#e5e5ea] hover:border-[#b150e2]/40 hover:shadow-md hover:scale-[1.01] transition-all duration-200 ${demoAnimating ? 'animate-slide-up' : ''}`}
              style={demoAnimating ? { animationDelay: `${index * 80}ms` } : undefined}
            >
              <div className="flex items-start gap-3">
                {p.imageUrl
                  ? <SafePodcastImage src={p.imageUrl} alt={p.title} width={80} height={80} className="rounded object-cover flex-shrink-0" />
                  : <div className="w-20 h-20 rounded bg-[#f5f5f7] flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-semibold text-[#1d1d1f] text-[15px] truncate">{p.title}</p>
                      {DEMO_IDS.has(p.id) && (
                        <span className="text-[10px] font-semibold bg-[#b150e2]/10 text-[#b150e2] px-1.5 py-0.5 rounded-md border border-[#b150e2]/20 flex-shrink-0">
                          ДЕМО
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm(`Удалить «${p.title}»? Это действие нельзя отменить.`)) {
                          removePodcast(p.id)
                        }
                      }}
                      className="text-[#aeaeb2] hover:text-red-500 p-1 transition-colors flex-shrink-0 -mt-0.5"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-[#6e6e73] text-[13px] mb-2 break-words">
                    {p.episodes.length} эп.
                    {p.uploadedPlatforms.length > 0 && (
                      <span className="ml-1.5 text-[#b150e2]">· {p.uploadedPlatforms.map(u => ({ mave: 'Mave', yandex: 'Яндекс', spotify: 'Spotify', vk: 'VK', youtube: 'YouTube' })[u.platform]).join(', ')}</span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {p.uploadedPlatforms.length > 0 && (
                      <button onClick={() => router.push(`/${p.id}/dashboard`)} className="text-[13px] bg-[#b150e2] hover:bg-[#9a3fd1] text-white px-3 py-1.5 rounded-lg transition-colors font-medium">
                        Дашборд
                      </button>
                    )}
                    <button onClick={() => router.push(`/${p.id}/setup`)} className="text-[13px] bg-[#f5f5f7] hover:bg-[#e5e5ea] text-[#1d1d1f] px-3 py-1.5 rounded-lg transition-colors">
                      + Данные
                    </button>
                  </div>
                </div>
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
    </>
  )
}
