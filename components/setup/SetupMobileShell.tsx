'use client'

import type { MutableRefObject, ReactNode, RefObject, TouchEvent } from 'react'
import { SafePodcastImage } from '@/components/SafePodcastImage'

export interface SetupStep {
  key: string
  label: string
  isDone: boolean
  isCurrent: boolean
}

interface Props {
  scenes: ReadonlyArray<{ id: string }>
  activeSceneIndex: number
  viewportHeight: number
  sceneViewportHeight: number
  chromeRef: RefObject<HTMLDivElement | null>
  sceneContentRefs: MutableRefObject<Array<HTMLDivElement | null>>
  onTouchStart: (event: TouchEvent<HTMLDivElement>) => void
  onTouchEnd: (event: TouchEvent<HTMLDivElement>) => void
  podcastTitle: string
  podcastImageUrl: string | undefined
  episodesCount: number
  steps: SetupStep[]
  onBack: () => void
  renderScene: (sceneId: string) => ReactNode
}

/** Мобильная оболочка мастера: шапка с чипами шагов и вертикальная лента сцен со свайпом. */
export function SetupMobileShell({
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
  episodesCount,
  steps,
  onBack,
  renderScene,
}: Props) {
  return (
    <div
      className="md:hidden mobile-viewport-shell bg-[#f5f5f7]"
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
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 18px)' }}
        >
          <button onClick={onBack} className="text-[#b150e2] text-[14px] font-medium hover:opacity-70 transition-opacity">
            ← Назад
          </button>
          <div className="mt-2.5 flex items-center gap-3">
            {podcastImageUrl && (
              <SafePodcastImage src={podcastImageUrl} alt={podcastTitle} width={36} height={36} className="rounded-xl object-cover shadow-sm" />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-[16px] font-semibold text-[#1d1d1f] truncate">{podcastTitle}</h1>
              <p className="text-[#6e6e73] text-[12px]">{episodesCount} эпизодов</p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            {steps.map(status => (
              <span
                key={status.key}
                className={[
                  'inline-flex items-center justify-center rounded-full px-2 py-1 text-[10px] font-medium border transition-colors flex-1',
                  status.isCurrent
                    ? status.isDone
                      ? 'border-[#b150e2] bg-green-50 text-green-700 shadow-[inset_0_0_0_1px_rgba(177,80,226,0.35)]'
                      : 'border-[#b150e2] bg-[#faf6ff] text-[#7b57c8]'
                    : status.isDone
                      ? 'border-green-100 bg-green-50 text-green-700'
                      : 'border-[#e5e5ea] bg-[#f5f5f7] text-[#8e8e93]',
                ].join(' ')}
              >
                {status.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden" style={{ height: sceneViewportHeight || undefined }}>
        <div
          className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            height: sceneViewportHeight > 0 ? sceneViewportHeight * scenes.length : undefined,
            transform: sceneViewportHeight > 0
              ? `translateY(-${activeSceneIndex * sceneViewportHeight}px)`
              : `translateY(-${activeSceneIndex * 100}%)`,
          }}
        >
          {scenes.map((scene, index) => (
            <section
              key={scene.id}
              className="shrink-0 px-4 py-4"
              style={{ height: sceneViewportHeight || undefined }}
            >
              <div
                ref={element => { sceneContentRefs.current[index] = element }}
                className="h-full overflow-y-auto overscroll-contain pb-[max(env(safe-area-inset-bottom),14px)]"
              >
                {renderScene(scene.id)}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
