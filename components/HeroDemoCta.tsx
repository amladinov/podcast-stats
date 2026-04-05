'use client'

import { useEffect, useRef, useState } from 'react'

type AnimationPhase = 'idle' | 'pressed' | 'signal' | 'morphing' | 'success' | 'resetting' | 'settling'

type HeroDemoCtaProps = {
  disabled?: boolean
  onFlowStart?: () => void
  onComplete?: () => void
}

const HERO_BUTTON_CONFIG = {
  baseShadowClassName:
    'shadow-[0_14px_28px_rgba(215,78,255,0.22),inset_0_1px_0_rgba(255,255,255,0.2)]',
  idleGlowClassName: 'animate-button-glow',
  pressedClassName:
    'translate-y-[5px] scale-x-[1.02] scale-y-[0.95] shadow-[0_6px_14px_rgba(215,78,255,0.2),inset_0_2px_5px_rgba(138,35,171,0.22)]',
  baseBackgroundImage: 'linear-gradient(135deg,#ff4fa3 0%,#d74eff 42%,#9158ff 100%)',
  successBackgroundImage: 'linear-gradient(135deg,#18c8b6 0%,#0ea5b7 100%)',
  successShadowClassName:
    'shadow-[0_12px_24px_rgba(14,165,183,0.26),inset_0_1px_0_rgba(255,255,255,0.22)]',
  checkRevealClassName: 'animate-check-pop-gel',
  signalClassName: 'animate-button-signal-sweep',
  pressDurationMs: 110,
  signalDurationMs: 220,
  morphDurationMs: 480,
  successHoldMs: 1450,
  resetDurationMs: 420,
  settleDurationMs: 320,
  labelExitDurationMs: 150,
  checkRevealDelayMs: 340,
  idleRadiusPx: 32,
  pressedRadiusPx: 34,
  compactRadiusPx: 999,
  resettingRadiusPx: 34,
  settlingRadiusPx: 32,
  morphEase: 'cubic-bezier(0.2, 0.9, 0.2, 1)',
  resetEase: 'cubic-bezier(0.23, 0.88, 0.32, 1)',
  morphTransformClassName: 'translate-y-[1px] scale-x-[0.968] scale-y-[1.02]',
  successTransformClassName: 'translate-y-0 scale-100',
  resetTransformClassName: 'translate-y-0 scale-100',
} as const

export function HeroDemoCta({ disabled = false, onFlowStart, onComplete }: HeroDemoCtaProps) {
  const [phase, setPhase] = useState<AnimationPhase>('idle')
  const [glowEnabled, setGlowEnabled] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)
  const timersRef = useRef<number[]>([])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 640px)')
    const syncViewport = () => setIsDesktop(mediaQuery.matches)
    syncViewport()
    mediaQuery.addEventListener('change', syncViewport)

    return () => {
      mediaQuery.removeEventListener('change', syncViewport)
      timersRef.current.forEach(timer => window.clearTimeout(timer))
      timersRef.current = []
    }
  }, [])

  function clearTimers() {
    timersRef.current.forEach(timer => window.clearTimeout(timer))
    timersRef.current = []
  }

  function schedule(delayMs: number, nextPhase: AnimationPhase) {
    const timer = window.setTimeout(() => {
      setPhase(nextPhase)
      timersRef.current = timersRef.current.filter(current => current !== timer)
    }, delayMs)

    timersRef.current.push(timer)
  }

  function runSuccessFlow() {
    clearTimers()
    setGlowEnabled(false)
    onFlowStart?.()
    setPhase('signal')
    schedule(HERO_BUTTON_CONFIG.signalDurationMs, 'morphing')
    schedule(HERO_BUTTON_CONFIG.signalDurationMs + HERO_BUTTON_CONFIG.morphDurationMs, 'success')
    schedule(
      HERO_BUTTON_CONFIG.signalDurationMs + HERO_BUTTON_CONFIG.morphDurationMs + HERO_BUTTON_CONFIG.successHoldMs,
      'resetting',
    )
    schedule(
      HERO_BUTTON_CONFIG.signalDurationMs +
        HERO_BUTTON_CONFIG.morphDurationMs +
        HERO_BUTTON_CONFIG.successHoldMs +
        HERO_BUTTON_CONFIG.resetDurationMs,
      'settling',
    )
    schedule(
      HERO_BUTTON_CONFIG.signalDurationMs +
        HERO_BUTTON_CONFIG.morphDurationMs +
        HERO_BUTTON_CONFIG.successHoldMs +
        HERO_BUTTON_CONFIG.resetDurationMs +
        HERO_BUTTON_CONFIG.settleDurationMs,
      'idle',
    )

    const completeTimer = window.setTimeout(() => {
      onComplete?.()
      timersRef.current = timersRef.current.filter(current => current !== completeTimer)
    }, HERO_BUTTON_CONFIG.signalDurationMs +
      HERO_BUTTON_CONFIG.morphDurationMs +
      HERO_BUTTON_CONFIG.successHoldMs +
      HERO_BUTTON_CONFIG.resetDurationMs +
      HERO_BUTTON_CONFIG.settleDurationMs)
    timersRef.current.push(completeTimer)

    const glowTimer = window.setTimeout(() => {
      setGlowEnabled(true)
      timersRef.current = timersRef.current.filter(current => current !== glowTimer)
    }, HERO_BUTTON_CONFIG.signalDurationMs +
      HERO_BUTTON_CONFIG.morphDurationMs +
      HERO_BUTTON_CONFIG.successHoldMs +
      HERO_BUTTON_CONFIG.resetDurationMs +
      HERO_BUTTON_CONFIG.settleDurationMs +
      360)
    timersRef.current.push(glowTimer)
  }

  function handlePointerDown() {
    if (phase !== 'idle' || disabled) return
    setPhase('pressed')
  }

  function handlePointerCancel() {
    setPhase(current => (current === 'pressed' ? 'idle' : current))
  }

  function handleActivate() {
    if (disabled || (phase !== 'idle' && phase !== 'pressed')) return

    clearTimers()

    if (phase === 'pressed') {
      const timer = window.setTimeout(() => {
        runSuccessFlow()
        timersRef.current = timersRef.current.filter(current => current !== timer)
      }, HERO_BUTTON_CONFIG.pressDurationMs)
      timersRef.current.push(timer)
      return
    }

    runSuccessFlow()
  }

  const isPressed = phase === 'pressed'
  const isSignal = phase === 'signal'
  const isMorphing = phase === 'morphing'
  const isSuccess = phase === 'success'
  const isResetting = phase === 'resetting'
  const isSettling = phase === 'settling'
  const isLocked = phase !== 'idle' && phase !== 'pressed'
  const isCompact = isDesktop && (isMorphing || isSuccess)
  const transitionDurationMs = isMorphing
    ? HERO_BUTTON_CONFIG.morphDurationMs
    : isResetting
      ? HERO_BUTTON_CONFIG.resetDurationMs
      : isSettling
        ? HERO_BUTTON_CONFIG.settleDurationMs
        : 180
  const transitionTimingFunction = isMorphing
    ? HERO_BUTTON_CONFIG.morphEase
    : isResetting || isSettling
      ? HERO_BUTTON_CONFIG.resetEase
      : 'ease-out'
  const currentBackgroundImage = isMorphing || isSuccess
    ? HERO_BUTTON_CONFIG.successBackgroundImage
    : HERO_BUTTON_CONFIG.baseBackgroundImage
  const currentShadowClassName = isMorphing || isSuccess
    ? HERO_BUTTON_CONFIG.successShadowClassName
    : HERO_BUTTON_CONFIG.baseShadowClassName
  const shouldHideLabel = isSignal || isMorphing || isSuccess
  const shouldShowCheck = isSuccess || isMorphing
  const currentBorderRadiusPx = isCompact
    ? HERO_BUTTON_CONFIG.compactRadiusPx
    : isPressed
      ? HERO_BUTTON_CONFIG.pressedRadiusPx
      : isResetting
        ? HERO_BUTTON_CONFIG.resettingRadiusPx
        : isSettling
          ? HERO_BUTTON_CONFIG.settlingRadiusPx
          : HERO_BUTTON_CONFIG.idleRadiusPx

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={() => {}}
      onPointerLeave={handlePointerCancel}
      onPointerCancel={handlePointerCancel}
      onClick={handleActivate}
      disabled={disabled || isLocked}
      aria-live="polite"
      aria-label={isSuccess ? 'Успешно' : 'Смотреть демо'}
      style={{
        backgroundImage: currentBackgroundImage,
        borderRadius: `${currentBorderRadiusPx}px`,
        width: isDesktop ? (isCompact ? '44px' : '188px') : undefined,
        transitionDuration: `${transitionDurationMs}ms`,
        transitionTimingFunction,
      }}
      className={[
        'button-demo relative inline-flex h-[44px] w-full sm:w-[188px] items-center justify-center overflow-hidden px-5 text-white outline-none transition-[width,transform,box-shadow,border-radius,background-image,background-color] disabled:cursor-default disabled:opacity-100',
        currentShadowClassName,
        isCompact ? 'px-0' : '',
        glowEnabled && !isPressed && !isSignal && !isMorphing && !isSuccess && !isResetting && !isSettling
          ? HERO_BUTTON_CONFIG.idleGlowClassName
          : '',
        isPressed ? HERO_BUTTON_CONFIG.pressedClassName : '',
        isMorphing ? HERO_BUTTON_CONFIG.morphTransformClassName : '',
        isSuccess ? HERO_BUTTON_CONFIG.successTransformClassName : '',
        isResetting ? HERO_BUTTON_CONFIG.resetTransformClassName : '',
        isSettling ? 'translate-y-0 scale-100' : '',
      ].join(' ')}
    >
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),transparent_42%,rgba(110,24,164,0.14)_100%)]" />
      <span className="pointer-events-none absolute inset-x-[18%] top-0 h-px bg-white/70 blur-[1px]" />
      <span
        className={[
          'pointer-events-none absolute inset-y-[14%] left-[-28%] z-[1] w-[34%] rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.02),rgba(255,255,255,0.62),rgba(255,255,255,0.06))] opacity-0 blur-[3px]',
          isSignal ? HERO_BUTTON_CONFIG.signalClassName : '',
        ].join(' ')}
        aria-hidden="true"
      />
      <span
        className={[
          'relative z-10 whitespace-nowrap text-[14px] font-medium tracking-normal transition-all ease-out',
          shouldHideLabel ? 'translate-y-2 scale-90 opacity-0' : '',
          isResetting || isSettling ? 'translate-y-0 scale-100 opacity-100 delay-75' : '',
        ].join(' ')}
        style={{ transitionDuration: `${HERO_BUTTON_CONFIG.labelExitDurationMs}ms` }}
      >
        Смотреть демо →
      </span>
      <span
        className={[
          'absolute inset-0 z-10 flex items-center justify-center opacity-0',
          shouldShowCheck ? HERO_BUTTON_CONFIG.checkRevealClassName : '',
        ].join(' ')}
        style={{
          animationDelay: shouldShowCheck ? `${isMorphing ? HERO_BUTTON_CONFIG.checkRevealDelayMs : 0}ms` : undefined,
        }}
        aria-hidden="true"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
          <path
            d="M6.5 12.5L10.3 16.3L17.8 8.8"
            stroke="currentColor"
            strokeWidth="2.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  )
}
