'use client'

import type { MutableRefObject, ReactNode, RefObject, TouchEvent } from 'react'
import { SafePodcastImage } from '@/components/SafePodcastImage'
import { getCtaClasses } from '@/lib/ctaStyles'

export interface MobileScene {
  id: string
  label: string
}

interface Props {
  scenes: MobileScene[]
  activeSceneIndex: number
  viewportHeight: number
  sceneViewportHeight: number
  chromeRef: RefObject<HTMLDivElement | null>
  sceneContentRefs: MutableRefObject<Array<HTMLDivElement | null>>
  onTouchStart: (event: TouchEvent<HTMLDivElement>) => void
  onTouchEnd: (event: TouchEvent<HTMLDivElement>) => void
  podcastTitle: string
  podcastImageUrl: string
  isDemo: boolean
  episodesCount: number
  /** Открыта карточка эпизода: шапка показывает «Детали эпизода» */
  episodeDetailOpen: boolean
  onBack: () => void
  onLoadCsv: () => void
  renderScene: (sceneId: string) => ReactNode
}

// Only intrinsically long lists scroll; "single-screen" scenes
// (summary/charts/ai/audience) must fit as-is — that's the UX intent.
const SCROLLABLE_SCENES = new Set(['overview', 'episodes', 'episode-detail', 'cities'])
// Long lists get extra room under the Safari iOS URL bar so scroll-end
// doesn't sit underneath it. Single-screen scenes use minimal padding.
const LONG_LIST_SCENES = new Set(['episodes', 'episode-detail', 'cities'])

/** Мобильная оболочка дашборда: шапка с индикатором сцен и вертикальная лента сцен со свайпом. */
export function MobileDashboardShell({
  scenes,
  activeSceneIndex,
  viewportHeight,
  sceneViewportHeight,
  chromeRef,
  sceneContentRefs,
  onTouchStart,
  onTouchEnd,
  podcastTitle,
  podcastImageUrl,
  isDemo,
  episodesCount,
  episodeDetailOpen,
  onBack,
  onLoadCsv,
  renderScene,
}: Props) {
  const isOverviewScene = activeSceneIndex === 0
  const totalScenes = scenes.length

  return (
    <div
      className="md:hidden mobile-viewport-shell bg-[#f5f5f7] print:hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: 'manipulation', height: viewportHeight || undefined }}
    >
      <div
        ref={chromeRef}
        className="shrink-0 border-b border-[#e8e8ed] bg-white/92 backdrop-blur-md"
      >
        <div
          className="px-4 pb-3"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
        >
          <div
            className={[
              'overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
              isOverviewScene ? 'max-h-[140px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-1',
            ].join(' ')}
            aria-hidden={!isOverviewScene}
          >
            <div className="flex items-center justify-between">
              <button onClick={onBack} className="text-[#b150e2] text-[14px] font-medium hover:opacity-70 transition-opacity">
                ← Назад
              </button>
              {isDemo && (
                <span className="rounded-md border border-[#b150e2]/20 bg-[#b150e2]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#b150e2]">
                  ДЕМО
                </span>
              )}
            </div>
            <div className="mt-2.5 flex items-center gap-3">
              {podcastImageUrl && (
                <SafePodcastImage src={podcastImageUrl} alt={podcastTitle} width={36} height={36} className="rounded-xl object-cover shadow-sm" />
              )}
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-[16px] font-semibold text-[#1d1d1f]">{podcastTitle}</h1>
                <p className="mt-0.5 text-[12px] text-[#6e6e73]">{episodesCount} эпизодов</p>
              </div>
            </div>
          </div>

          <div
            className={[
              'overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
              isOverviewScene ? 'max-h-0 opacity-0 translate-y-1' : 'max-h-[52px] opacity-100 translate-y-0',
            ].join(' ')}
            aria-hidden={isOverviewScene}
          >
            <div className="flex items-center justify-between gap-3">
              <button onClick={onBack} className="text-[#b150e2] text-[13px] font-medium hover:opacity-70 transition-opacity">
                ← Назад
              </button>
              <div className="min-w-0 flex-1 text-center">
                <p className="truncate text-[14px] font-semibold text-[#1d1d1f]">{episodeDetailOpen ? 'Детали эпизода' : podcastTitle}</p>
              </div>
              <div className="w-[56px]" />
            </div>
          </div>

          {episodesCount > 0 && (
            <div
              className="flex justify-center transition-[margin-top] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ marginTop: isOverviewScene ? 16 : 12 }}
            >
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f5f7] px-3 py-2 shadow-[inset_0_0_0_1px_rgba(229,229,234,1)]">
                {scenes.map((scene, index) => (
                  <span
                    key={scene.id}
                    className={[
                      'block h-1.5 rounded-full transition-all duration-300',
                      activeSceneIndex === index ? 'w-10 bg-[#b150e2]' : 'w-5 bg-[#d8d8dd]',
                    ].join(' ')}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative overflow-hidden" style={{ height: sceneViewportHeight || undefined }}>
        {episodesCount === 0 ? (
          <div className="px-4 py-6">
            <div className="rounded-2xl border border-[#e5e5ea] bg-white px-6 py-12 text-center shadow-sm">
              <p className="text-[15px] text-[#6e6e73]">Данных пока нет</p>
              <button
                onClick={onLoadCsv}
                className={`${getCtaClasses({ tone: 'primary', fullWidth: true })} mt-4`}
              >
                Загрузить CSV
              </button>
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              height: sceneViewportHeight > 0 ? sceneViewportHeight * totalScenes : undefined,
              transform: sceneViewportHeight > 0
                ? `translateY(-${activeSceneIndex * sceneViewportHeight}px)`
                : `translateY(-${activeSceneIndex * 100}%)`,
            }}
          >
            {scenes.map((scene, index) => (
              <section
                key={scene.id}
                className="shrink-0 px-4 py-3"
                style={{ height: sceneViewportHeight || undefined }}
              >
                <div
                  ref={element => { sceneContentRefs.current[index] = element }}
                  className={[
                    'h-full overscroll-contain',
                    SCROLLABLE_SCENES.has(scene.id) ? 'overflow-y-auto' : 'overflow-hidden',
                  ].join(' ')}
                  style={{
                    paddingBottom: LONG_LIST_SCENES.has(scene.id)
                      ? 'max(env(safe-area-inset-bottom), 92px)'
                      : 'max(env(safe-area-inset-bottom), 16px)',
                  }}
                >
                  {renderScene(scene.id)}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
