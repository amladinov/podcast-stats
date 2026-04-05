'use client'

import { useEffect, useRef, useState } from 'react'

export type AnimationPhase = 'idle' | 'pressed' | 'signal' | 'morphing' | 'success' | 'resetting' | 'settling'

export type MotionDemoButtonConfig = {
  baseShadowClassName: string
  idleGlowClassName: string
  pressedClassName: string
  baseBackgroundImage: string
  successBackgroundImage: string
  successShadowClassName: string
  checkRevealClassName: string
  signalClassName: string
  cardAnimationLeadMs: number
  pressDurationMs: number
  signalDurationMs: number
  morphDurationMs: number
  successHoldMs: number
  resetDurationMs: number
  settleDurationMs: number
  labelExitDurationMs: number
  checkRevealDelayMs: number
  idleRadiusPx: number
  pressedRadiusPx: number
  compactRadiusPx: number
  resettingRadiusPx: number
  settlingRadiusPx: number
  morphEase: string
  resetEase: string
  morphTransformClassName: string
  successTransformClassName: string
  resetTransformClassName: string
}

export const PLAYGROUND_BUTTON_CONFIG: MotionDemoButtonConfig = {
  baseShadowClassName:
    'shadow-[0_18px_36px_rgba(215,78,255,0.24),inset_0_1px_0_rgba(255,255,255,0.2)]',
  idleGlowClassName: 'animate-button-glow',
  pressedClassName:
    'translate-y-[8px] scale-x-[1.02] scale-y-[0.95] shadow-[0_8px_18px_rgba(215,78,255,0.22),inset_0_2px_5px_rgba(138,35,171,0.22)]',
  baseBackgroundImage: 'linear-gradient(135deg,#ff4fa3 0%,#d74eff 42%,#9158ff 100%)',
  successBackgroundImage: 'linear-gradient(135deg,#18c8b6 0%,#0ea5b7 100%)',
  successShadowClassName:
    'shadow-[0_14px_28px_rgba(14,165,183,0.28),inset_0_1px_0_rgba(255,255,255,0.22)]',
  checkRevealClassName: 'animate-check-pop-gel',
  signalClassName: 'animate-button-signal-sweep',
  cardAnimationLeadMs: 320,
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
}

type MotionDemoButtonProps = {
  config?: MotionDemoButtonConfig
  disabled?: boolean
  label?: string
  className?: string
  compactSizeClassName?: string
  textClassName?: string
  checkIconClassName?: string
  onFlowStart?: () => void
  onCardAnimationStart?: () => void
  onComplete?: () => void
}

export function MotionDemoButton({
  config = PLAYGROUND_BUTTON_CONFIG,
  disabled = false,
  label = 'Смотреть демо →',
  className = '',
  compactSizeClassName = 'w-[92px] px-0',
  textClassName = 'text-[24px] font-semibold tracking-[-0.03em]',
  checkIconClassName = 'h-9 w-9',
  onFlowStart,
  onCardAnimationStart,
  onComplete,
}: MotionDemoButtonProps) {
  const [phase, setPhase] = useState<AnimationPhase>('idle')
  const [glowEnabled, setGlowEnabled] = useState(true)
  const timersRef = useRef<number[]>([])

  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => window.clearTimeout(timer))
      timersRef.current = []
    }
  }, [])

  function clearTimers() {
    timersRef.current.forEach(timer => window.clearTimeout(timer))
    timersRef.current = []
  }

  function schedule(delayMs: number, fn: () => void) {
    const timer = window.setTimeout(() => {
      fn()
      timersRef.current = timersRef.current.filter(current => current !== timer)
    }, delayMs)

    timersRef.current.push(timer)
  }

  function runSuccessFlow() {
    clearTimers()
    setGlowEnabled(false)
    onFlowStart?.()
    setPhase('signal')
    schedule(config.signalDurationMs, () => setPhase('morphing'))
    schedule(config.signalDurationMs + config.morphDurationMs, () => setPhase('success'))
    schedule(config.signalDurationMs + config.morphDurationMs + config.successHoldMs, () => setPhase('resetting'))
    schedule(config.signalDurationMs + config.morphDurationMs + config.successHoldMs + config.resetDurationMs, () => setPhase('settling'))
    schedule(
      config.signalDurationMs + config.morphDurationMs + config.successHoldMs + config.resetDurationMs + config.settleDurationMs,
      () => {
        setPhase('idle')
        onComplete?.()
      },
    )
    schedule(config.signalDurationMs + config.morphDurationMs + config.successHoldMs - config.cardAnimationLeadMs, () => onCardAnimationStart?.())
    const glowTimer = window.setTimeout(() => {
      setGlowEnabled(true)
      timersRef.current = timersRef.current.filter(current => current !== glowTimer)
    }, config.signalDurationMs + config.morphDurationMs + config.successHoldMs + config.resetDurationMs + config.settleDurationMs + 360)
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
      }, config.pressDurationMs)
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
  const isCompact = isMorphing || isSuccess
  const transitionDurationMs = isMorphing
    ? config.morphDurationMs
    : isResetting
      ? config.resetDurationMs
      : isSettling
        ? config.settleDurationMs
        : 180
  const transitionTimingFunction = isMorphing ? config.morphEase : isResetting || isSettling ? config.resetEase : 'ease-out'
  const currentBackgroundImage = isMorphing || isSuccess ? config.successBackgroundImage : config.baseBackgroundImage
  const currentShadowClassName = isMorphing || isSuccess ? config.successShadowClassName : config.baseShadowClassName
  const shouldHideLabel = isSignal || isMorphing || isSuccess
  const shouldShowCheck = isSuccess || isMorphing
  const currentBorderRadiusPx = isCompact
    ? config.compactRadiusPx
    : isPressed
      ? config.pressedRadiusPx
      : isResetting
        ? config.resettingRadiusPx
        : isSettling
          ? config.settlingRadiusPx
          : config.idleRadiusPx

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
      aria-label={isSuccess ? 'Успешно' : label}
      style={{
        backgroundImage: currentBackgroundImage,
        borderRadius: `${currentBorderRadiusPx}px`,
        transitionDuration: `${transitionDurationMs}ms`,
        transitionTimingFunction,
      }}
      className={[
        'button-demo relative inline-flex items-center justify-center overflow-hidden text-white outline-none transition-[width,transform,box-shadow,border-radius,background-image,background-color] disabled:cursor-default disabled:opacity-100',
        currentShadowClassName,
        isCompact ? compactSizeClassName : '',
        glowEnabled && !isPressed && !isSignal && !isMorphing && !isSuccess && !isResetting && !isSettling ? config.idleGlowClassName : '',
        isPressed ? config.pressedClassName : '',
        isMorphing ? config.morphTransformClassName : '',
        isSuccess ? config.successTransformClassName : '',
        isResetting ? config.resetTransformClassName : '',
        isSettling ? 'translate-y-0 scale-100' : '',
        className,
      ].join(' ')}
    >
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),transparent_42%,rgba(110,24,164,0.14)_100%)]" />
      <span className="pointer-events-none absolute inset-x-[18%] top-0 h-px bg-white/70 blur-[1px]" />
      <span
        className={[
          'pointer-events-none absolute inset-y-[14%] left-[-28%] z-[1] w-[34%] rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.02),rgba(255,255,255,0.62),rgba(255,255,255,0.06))] opacity-0 blur-[3px]',
          isSignal ? config.signalClassName : '',
        ].join(' ')}
        aria-hidden="true"
      />
      <span
        className={[
          'relative z-10 whitespace-nowrap transition-all ease-out',
          textClassName,
          shouldHideLabel ? 'translate-y-2 scale-90 opacity-0' : '',
          isResetting || isSettling ? 'translate-y-0 scale-100 opacity-100 delay-75' : '',
        ].join(' ')}
        style={{ transitionDuration: `${config.labelExitDurationMs}ms` }}
      >
        {label}
      </span>
      <span
        className={[
          'absolute inset-0 z-10 flex items-center justify-center opacity-0',
          shouldShowCheck ? config.checkRevealClassName : '',
        ].join(' ')}
        style={{
          animationDelay: shouldShowCheck ? `${isMorphing ? config.checkRevealDelayMs : 0}ms` : undefined,
        }}
        aria-hidden="true"
      >
        <svg className={checkIconClassName} viewBox="0 0 24 24" fill="none">
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
