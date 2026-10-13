'use client'

import { useEffect, useRef, useState } from 'react'

interface Params {
  totalScenes: number
  /** Любое изменение этой строки заставляет заново измерить высоту экрана и шапки. */
  remeasureKey: string
  /** Поправка к высоте сцены (дашборду нужно +25px «воздуха»). */
  sceneHeightOffset?: number
}

/**
 * Полноэкранные мобильные сцены со свайпом вверх/вниз:
 * блокировка скролла страницы, измерение высоты viewport и шапки,
 * обработка касаний с учётом прокрутки внутри сцены.
 */
export function useMobileScenes({ totalScenes, remeasureKey, sceneHeightOffset = 0 }: Params) {
  const [sceneIndex, setSceneIndex] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [chromeHeight, setChromeHeight] = useState(0)
  const chromeRef = useRef<HTMLDivElement | null>(null)
  const sceneContentRefs = useRef<Array<HTMLDivElement | null>>([])
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const activeSceneIndex = Math.min(sceneIndex, Math.max(totalScenes - 1, 0))
  const sceneViewportHeight = viewportHeight > 0
    ? Math.max(viewportHeight - chromeHeight + sceneHeightOffset, 0)
    : 0

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

    const syncMobileHeights = () => {
      // Prefer visualViewport.height — it's the only source that correctly
      // reflects the floating Safari iOS URL bar in real time. 100dvh can
      // briefly report the no-URL-bar height during the first render even
      // when the URL bar is visible, pushing content under it.
      const visual = window.visualViewport?.height

      // Fallback: measure 100dvh via probe (works on browsers without
      // visualViewport API).
      const probe = document.createElement('div')
      probe.style.cssText = 'position:fixed;top:0;height:100dvh;pointer-events:none;visibility:hidden'
      document.body.appendChild(probe)
      const dvh = probe.offsetHeight
      document.body.removeChild(probe)

      setViewportHeight(visual || dvh || window.innerHeight)
      setChromeHeight(chromeRef.current?.offsetHeight ?? 0)
    }

    syncMobileHeights()
    window.addEventListener('resize', syncMobileHeights)
    window.addEventListener('orientationchange', syncMobileHeights)
    window.visualViewport?.addEventListener('resize', syncMobileHeights)

    return () => {
      window.removeEventListener('resize', syncMobileHeights)
      window.removeEventListener('orientationchange', syncMobileHeights)
      window.visualViewport?.removeEventListener('resize', syncMobileHeights)
    }
  }, [totalScenes, remeasureKey])

  function onTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  function onTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current
    touchStartRef.current = null
    if (!start) return

    const touch = event.changedTouches[0]
    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y

    if (Math.abs(deltaY) < 56 || Math.abs(deltaY) < Math.abs(deltaX) * 1.2) return

    // A "decisive" swipe (>180px) always advances the scene, even when the
    // content is scrollable inside. Otherwise users could get stuck on scenes
    // whose content exceeds the viewport (e.g. when the browser URL bar
    // squeezes 100dvh on Arc/Telegram WebView).
    const FORCE_SWITCH_THRESHOLD_PX = 180
    const isDecisive = Math.abs(deltaY) > FORCE_SWITCH_THRESHOLD_PX

    const currentContent = sceneContentRefs.current[activeSceneIndex]
    const canScrollInside = Boolean(currentContent && currentContent.scrollHeight > currentContent.clientHeight + 4)
    const scrollTop = currentContent?.scrollTop ?? 0
    const nearBottom = !currentContent || scrollTop + currentContent.clientHeight >= currentContent.scrollHeight - 4

    if (deltaY < 0) {
      if (canScrollInside && !nearBottom && !isDecisive) return
      if (activeSceneIndex < totalScenes - 1) {
        setSceneIndex(prev => prev + 1)
      } else {
        setSceneIndex(0)
      }
      return
    }

    if (scrollTop > 4 && !isDecisive) return
    if (activeSceneIndex > 0) {
      setSceneIndex(prev => prev - 1)
    }
  }

  return {
    sceneIndex,
    setSceneIndex,
    activeSceneIndex,
    viewportHeight,
    sceneViewportHeight,
    chromeRef,
    sceneContentRefs,
    onTouchStart,
    onTouchEnd,
  }
}
