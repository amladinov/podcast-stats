'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { HeroDemoCta } from '@/components/HeroDemoCta'
import { SafePodcastImage } from '@/components/SafePodcastImage'
import { getCtaClasses } from '@/lib/ctaStyles'
import { resolvePodcastCoverUrl } from '@/lib/podcastCover'
import { usePodcastStore } from '@/lib/store'
import { DEMO_IDS } from '@/lib/demoData'
import type { RSSEpisode } from '@/types'

function PodcastCard({
  podcast,
  onRemove,
  onOpenDashboard,
  onOpenSetup,
  compact = false,
}: {
  podcast: ReturnType<typeof usePodcastStore.getState>['podcasts'][number]
  onRemove: () => void
  onOpenDashboard: () => void
  onOpenSetup: () => void
  compact?: boolean
}) {
  const coverUrl = resolvePodcastCoverUrl(podcast)

  return (
    <div
      className={[
        'bg-white rounded-2xl shadow-sm border border-[#e5e5ea] hover:border-[#b150e2]/40 hover:shadow-md hover:scale-[1.01] transition-all duration-200',
        compact ? 'p-3' : 'p-4',
      ].join(' ')}
    >
      <div className={['flex items-start', compact ? 'gap-2.5' : 'gap-3'].join(' ')}>
        {coverUrl
          ? <SafePodcastImage src={coverUrl} alt={podcast.title} width={compact ? 58 : 80} height={compact ? 58 : 80} className="rounded object-cover flex-shrink-0" />
          : <div className={['rounded bg-[#f5f5f7] flex-shrink-0', compact ? 'w-[58px] h-[58px]' : 'w-20 h-20'].join(' ')} />
        }
        <div className="flex-1 min-w-0">
          <div className={['flex items-start justify-between gap-2', compact ? 'mb-0' : 'mb-0.5'].join(' ')}>
            <div className="flex items-center gap-2 min-w-0">
              <p className={['font-semibold text-[#1d1d1f] truncate', compact ? 'text-[14px] leading-[1.15]' : 'text-[15px]'].join(' ')}>{podcast.title}</p>
              {DEMO_IDS.has(podcast.id) && (
                <span className={['font-semibold bg-[#b150e2]/10 text-[#b150e2] rounded-md border border-[#b150e2]/20 flex-shrink-0', compact ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-1.5 py-0.5'].join(' ')}>
                  ДЕМО
                </span>
              )}
            </div>
            <button
              onClick={onRemove}
              className={['text-[#aeaeb2] hover:text-red-500 transition-colors flex-shrink-0', compact ? 'p-0.5 -mt-0.5 text-[13px]' : 'p-1 -mt-0.5'].join(' ')}
            >
              ✕
            </button>
          </div>
          <p className={['text-[#6e6e73] break-words', compact ? 'text-[12px] mb-1.5 leading-[1.25]' : 'text-[13px] mb-2'].join(' ')}>
            {podcast.episodes.length} эп.
            {podcast.uploadedPlatforms.length > 0 && (
              <span className="ml-1.5 text-[#b150e2]">· {podcast.uploadedPlatforms.map(u => ({ mave: 'Mave', yandex: 'Яндекс', spotify: 'Spotify', vk: 'VK', youtube: 'YouTube' })[u.platform]).join(', ')}</span>
            )}
          </p>
          <div className={['flex flex-wrap', compact ? 'gap-1.5' : 'gap-2'].join(' ')}>
            {podcast.uploadedPlatforms.length > 0 && (
              <button onClick={onOpenDashboard} className={['bg-[#b150e2] hover:bg-[#9a3fd1] text-white rounded-lg transition-colors font-medium', compact ? 'text-[12px] px-2.5 py-1.5' : 'text-[13px] px-3 py-1.5'].join(' ')}>
                Дашборд
              </button>
            )}
            <button onClick={onOpenSetup} className={['bg-[#f5f5f7] hover:bg-[#e5e5ea] text-[#1d1d1f] rounded-lg transition-colors', compact ? 'text-[12px] px-2.5 py-1.5' : 'text-[13px] px-3 py-1.5'].join(' ')}>
              + Данные
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const totalScenes = 2
  const podcasts = usePodcastStore(s => s.podcasts)
  const addPodcast = usePodcastStore(s => s.addPodcast)
  const removePodcast = usePodcastStore(s => s.removePodcast)
  const loadDemo = usePodcastStore(s => s.loadDemo)
  const [rssUrl, setRssUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDemoNavigating, setIsDemoNavigating] = useState(false)
  const [mobileSceneIndex, setMobileSceneIndex] = useState(0)
  const [mobileSecondScreenMode, setMobileSecondScreenMode] = useState<'empty' | 'demo'>('empty')
  const [viewportHeight, setViewportHeight] = useState(0)
  const sceneMapInsetPx = 54
  const sceneMapTopOffsetPx = 18
  const mobileTouchStartRef = useRef<{ x: number; y: number } | null>(null)
  const mobilePodcastListRef = useRef<HTMLDivElement | null>(null)
  const demoNavigationTimerRef = useRef<number | null>(null)
  const compareTransitionTimerRef = useRef<number | null>(null)
  const canCompare = podcasts.filter(p => p.uploadedPlatforms.length > 0).length >= 2
  const [compareVisibility, setCompareVisibility] = useState<'text' | 'text-exit' | 'button-enter' | 'button'>(canCompare ? 'button' : 'text')

  useEffect(() => {
    return () => {
      if (demoNavigationTimerRef.current !== null) {
        window.clearTimeout(demoNavigationTimerRef.current)
      }
      if (compareTransitionTimerRef.current !== null) {
        window.clearTimeout(compareTransitionTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const html = document.documentElement
    const body = document.body
    const previousHtmlOverflow = html.style.overflow
    const previousBodyOverflow = body.style.overflow
    const previousBodyOverscroll = body.style.overscrollBehaviorY

    const syncMobileViewportLock = () => {
      if (window.matchMedia('(max-width: 767px)').matches) {
        html.style.overflow = 'hidden'
        body.style.overflow = 'hidden'
        body.style.overscrollBehaviorY = 'none'
      } else {
        html.style.overflow = previousHtmlOverflow
        body.style.overflow = previousBodyOverflow
        body.style.overscrollBehaviorY = previousBodyOverscroll
      }
    }

    syncMobileViewportLock()
    window.addEventListener('resize', syncMobileViewportLock)

    return () => {
      window.removeEventListener('resize', syncMobileViewportLock)
      html.style.overflow = previousHtmlOverflow
      body.style.overflow = previousBodyOverflow
      body.style.overscrollBehaviorY = previousBodyOverscroll
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const syncViewportHeight = () => {
      setViewportHeight(window.innerHeight)
    }

    syncViewportHeight()
    window.addEventListener('resize', syncViewportHeight)
    window.addEventListener('orientationchange', syncViewportHeight)

    return () => {
      window.removeEventListener('resize', syncViewportHeight)
      window.removeEventListener('orientationchange', syncViewportHeight)
    }
  }, [])

  useEffect(() => {
    if (compareTransitionTimerRef.current !== null) {
      window.clearTimeout(compareTransitionTimerRef.current)
      compareTransitionTimerRef.current = null
    }

    if (canCompare) {
      if (compareVisibility === 'button' || compareVisibility === 'button-enter') return

      setCompareVisibility('text-exit')
      compareTransitionTimerRef.current = window.setTimeout(() => {
        setCompareVisibility('button-enter')
        compareTransitionTimerRef.current = window.setTimeout(() => {
          setCompareVisibility('button')
          compareTransitionTimerRef.current = null
        }, 220)
      }, 90)
      return
    }

    if (compareVisibility === 'text' || compareVisibility === 'text-exit') return

    setCompareVisibility('button-enter')
    compareTransitionTimerRef.current = window.setTimeout(() => {
      setCompareVisibility('text')
      compareTransitionTimerRef.current = null
    }, 220)
  }, [canCompare, compareVisibility])

  function handleDemoComplete() {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      loadDemo()
      setMobileSecondScreenMode('demo')
      setMobileSceneIndex(1)
      return
    }

    if (isDemoNavigating) return

    loadDemo()
    setIsDemoNavigating(true)

    demoNavigationTimerRef.current = window.setTimeout(() => {
      router.push('/demo/dashboard')
      demoNavigationTimerRef.current = null
    }, 1000)
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

  function handleMobileTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0]
    mobileTouchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  function handleMobileTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const start = mobileTouchStartRef.current
    mobileTouchStartRef.current = null
    if (!start) return

    const touch = event.changedTouches[0]
    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y

    if (Math.abs(deltaY) < 56 || Math.abs(deltaY) < Math.abs(deltaX) * 1.2) return

    if (deltaY < 0) {
      if (mobileSceneIndex === 0) {
        setMobileSceneIndex(1)
      }
      return
    }

    if (mobileSceneIndex === 1) {
      const listScrollTop = mobilePodcastListRef.current?.scrollTop ?? 0
      if (listScrollTop > 4) return
      setMobileSceneIndex(0)
    }
  }

  return (
    <>
    <main
      className="mobile-viewport-shell relative md:hidden bg-[#f5f5f7]"
      onTouchStart={handleMobileTouchStart}
      onTouchEnd={handleMobileTouchEnd}
      style={{ touchAction: 'manipulation' }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 z-20 px-4"
        style={{ top: `calc(env(safe-area-inset-top) + ${sceneMapTopOffsetPx}px)` }}
      >
        <div className="mx-auto flex w-full max-w-[430px] justify-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/88 px-3 py-2 shadow-[0_12px_28px_rgba(29,29,31,0.10)] backdrop-blur-md">
            {Array.from({ length: totalScenes }).map((_, index) => (
              <span
                key={index}
                className={[
                  'block h-1.5 rounded-full transition-all duration-300',
                  mobileSceneIndex === index
                    ? 'w-10 bg-[#b150e2]'
                    : 'w-6 bg-[#d8d8dd]',
                ].join(' ')}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          height: viewportHeight > 0 ? viewportHeight * 2 : undefined,
          transform: viewportHeight > 0
            ? `translateY(-${mobileSceneIndex * viewportHeight}px)`
            : `translateY(-${mobileSceneIndex * 100}%)`,
        }}
      >
        <section
          className="shrink-0 overflow-hidden px-4"
          style={{ height: viewportHeight > 0 ? viewportHeight : undefined }}
        >
          <div
            className="mx-auto grid h-full w-full max-w-[430px] grid-rows-[1fr] pt-[max(env(safe-area-inset-top),14px)]"
            style={{
              paddingTop: `calc(max(env(safe-area-inset-top), 14px) + ${sceneMapInsetPx}px)`,
              paddingBottom: 'max(env(safe-area-inset-bottom), 10px)',
            }}
          >
            <div className="relative self-center min-h-[72svh] overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,244,255,0.92)_45%,rgba(247,249,255,0.94))] shadow-[0_16px_50px_rgba(29,29,31,0.08)] pt-7">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-14 left-[-10%] hidden h-44 w-44 rounded-full bg-[#b150e2]/18 blur-3xl md:block" />
                <div className="absolute top-10 right-[-8%] h-52 w-52 rounded-full bg-[#0a84ff]/14 blur-3xl" />
                <div className="absolute bottom-[-4.5rem] left-1/2 h-36 w-64 -translate-x-1/2 rounded-full bg-[#ff9f0a]/14 blur-3xl" />
                <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(177,80,226,0.4),transparent)]" />
              </div>

              <div className="relative flex min-h-full flex-col justify-between text-center px-5 pb-[clamp(1.25rem,2.8vh,1.7rem)] pt-[clamp(0.1rem,0.7vh,0.3rem)]">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-medium tracking-[0.12em] text-[#7b57c8] uppercase shadow-sm mb-4">
                  Podcast Stats
                  </div>
                  <h1 className="text-[clamp(2rem,7.8vw,2.95rem)] font-bold text-[#1d1d1f] tracking-tight mb-[clamp(0.65rem,1.6vh,0.95rem)] leading-[0.97]">
                    Полная статистика подкаста
                    <br /> в одном аккуратном дашборде
                  </h1>
                  <p className="text-[#4a4a52] text-[clamp(0.94rem,3.7vw,1.03rem)] mb-[clamp(1rem,2.4vh,1.35rem)] max-w-xl mx-auto leading-relaxed">
                    Подключи RSS, загрузи выгрузки платформ и собери Яндекс, Spotify, VK, Mave и YouTube в один понятный отчёт.
                  </p>

                  <div className="grid grid-cols-1 gap-[clamp(0.58rem,1.35vh,0.82rem)] justify-items-start mb-[clamp(1rem,2.4vh,1.35rem)] max-w-xs mx-auto">
                    <div className="flex items-center justify-start gap-2">
                      <span className="w-7 h-7 rounded-full bg-[#b150e2] text-white text-[12px] font-bold flex items-center justify-center flex-shrink-0">1</span>
                      <span className="text-[#1d1d1f] text-[14px] font-medium">RSS-ссылка</span>
                    </div>
                    <div className="flex items-center justify-start gap-2">
                      <span className="w-7 h-7 rounded-full bg-[#b150e2] text-white text-[12px] font-bold flex items-center justify-center flex-shrink-0">2</span>
                      <span className="text-[#1d1d1f] text-[14px] font-medium">Данные платформ</span>
                    </div>
                    <div className="flex items-center justify-start gap-2">
                      <span className="w-7 h-7 rounded-full bg-[#b150e2] text-white text-[12px] font-bold flex items-center justify-center flex-shrink-0">3</span>
                      <span className="text-[#1d1d1f] text-[14px] font-medium">Аналитика + AI</span>
                    </div>
                  </div>
                </div>

                <div>
                  <HeroDemoCta
                    disabled={isDemoNavigating}
                    onComplete={handleDemoComplete}
                  />
                  <p className="mt-[clamp(0.9rem,1.9vh,1.1rem)] text-[12px] text-[#8e8e93]">
                    Свайпни вверх, чтобы добавить свой подкаст
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="shrink-0 overflow-hidden px-4"
          style={{ height: viewportHeight > 0 ? viewportHeight : undefined }}
        >
          <div
            className="mx-auto flex h-full w-full max-w-[430px] flex-col gap-3 pt-[max(env(safe-area-inset-top),14px)]"
            style={{
              paddingTop: `calc(max(env(safe-area-inset-top), 14px) + ${sceneMapInsetPx + 10}px)`,
              paddingBottom: 'max(env(safe-area-inset-bottom), 10px)',
            }}
          >
            <div className="shrink-0 bg-white rounded-2xl p-4 shadow-sm border border-[#e5e5ea]">
              <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-3">Добавить подкаст</h2>
              <div className="flex flex-col gap-1.5">
                <input
                  type="url"
                  value={rssUrl}
                  onChange={e => setRssUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder="RSS-ссылка подкаста"
                  className="flex-1 bg-[#f5f5f7] border border-[#e5e5ea] rounded-xl px-4 py-2 text-[14px] text-[#1d1d1f] placeholder-[#aeaeb2] focus:outline-none focus:border-[#b150e2] focus:ring-2 focus:ring-[#b150e2]/20 transition-all"
                />
                <button
                  onClick={handleAdd}
                  disabled={loading || !rssUrl.trim()}
                  className={getCtaClasses({
                    tone: 'primary',
                    fullWidth: true,
                    disabled: loading || !rssUrl.trim(),
                  })}
                >
                  {loading ? 'Загружаю...' : 'Добавить'}
                </button>
              </div>
              {error && <p className="text-red-500 text-[13px] mt-3">{error}</p>}
            </div>

            <div className="min-h-0 flex-1">
              {mobileSecondScreenMode === 'demo' && podcasts.length > 0 ? (
                <div className="h-full pb-2">
                  <div className="space-y-1.5">
                    {podcasts.map(p => (
                      <PodcastCard
                        key={p.id}
                        podcast={p}
                        compact
                        onRemove={() => {
                          if (window.confirm(`Удалить «${p.title}»? Это действие нельзя отменить.`)) {
                            removePodcast(p.id)
                          }
                        }}
                        onOpenDashboard={() => router.push(`/${p.id}/dashboard`)}
                        onOpenSetup={() => router.push(`/${p.id}/setup`)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full pb-4">
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[#d2d2d7] bg-white/55 px-6 text-center">
                    <div>
                      <div className="text-4xl mb-3">🎙️</div>
                      <p className="text-[#6e6e73] text-[14px] mb-2">Добавь RSS-ссылку подкаста, чтобы начать</p>
                      <p className="text-[#aeaeb2] text-[12px]">
                        Например:{' '}
                        <span className="font-mono text-[#b150e2] break-all">
                          https://mave.digital/ep/sovet-direktorov.rss
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>

    <main className="hidden md:block max-w-3xl mx-auto px-4 py-8 sm:py-16">
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
            <HeroDemoCta
              disabled={isDemoNavigating}
              onComplete={handleDemoComplete}
            />
          </div>
          <div className="mt-3 flex min-h-[52px] justify-center">
            {(compareVisibility === 'text' || compareVisibility === 'text-exit') && (
              <p
                className={[
                  'max-w-sm text-[13px] text-[#6e6e73] transition-all duration-200',
                  compareVisibility === 'text-exit' ? 'translate-y-[5px] opacity-0' : 'translate-y-0 opacity-100',
                ].join(' ')}
              >
                Сравнение станет доступно, когда появятся хотя бы 2 подкаста с данными.
              </p>
            )}

            {(compareVisibility === 'button-enter' || compareVisibility === 'button') && (
              <button
                onClick={() => router.push('/compare')}
                className={[
                  getCtaClasses({ tone: 'secondary', fullWidth: true }),
                  'border-white/80 bg-white/85 text-[#7b57c8] hover:bg-white hover:shadow-[0_12px_24px_rgba(123,87,200,0.12)] duration-220',
                  compareVisibility === 'button-enter' ? 'translate-y-[6px] opacity-0' : 'translate-y-0 opacity-100',
                ].join(' ')}
              >
                Сравнить подкасты
              </button>
            )}
          </div>
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
            className={getCtaClasses({
              tone: 'primary',
              fullWidth: true,
              disabled: loading || !rssUrl.trim(),
            })}
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
            <PodcastCard
              key={p.id}
              podcast={p}
              onRemove={() => {
                if (window.confirm(`Удалить «${p.title}»? Это действие нельзя отменить.`)) {
                  removePodcast(p.id)
                }
              }}
              onOpenDashboard={() => router.push(`/${p.id}/dashboard`)}
              onOpenSetup={() => router.push(`/${p.id}/setup`)}
            />
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
