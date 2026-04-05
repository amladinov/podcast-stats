'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

type MotionVariant = 'soft' | 'snappy' | 'gel'
type AnimationPhase = 'idle' | 'pressed' | 'signal' | 'morphing' | 'success' | 'resetting' | 'settling'

type MotionCard = {
  id: MotionVariant
  label: string
  title: string
  blurb: string
  details: string
  baseShadowClassName: string
  idleGlowClassName: string
  pressedClassName: string
  baseBackgroundImage: string
  successBackgroundImage: string
  successShadowClassName: string
  checkRevealClassName: string
  signalClassName: string
  successTone: string
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

const FOCUSED_CARD: MotionCard = {
  id: 'gel',
  label: 'Hybrid Focus',
  title: 'Гибрид для полировки',
  blurb: 'Форма и пластика из Gel, но success-цвет взят из Snappy Tech для более чистого и современного ощущения.',
  details: 'Оставлен один вариант, чтобы дальше настраивать только тайминги, плотность морфа и характер появления галочки без визуального шума.',
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
  successTone: 'Цвет success из второго варианта, внешний вид и reveal галочки из третьего.',
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

function DemoButtonCard({ card }: { card: MotionCard }) {
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
    setPhase('signal')
    schedule(card.signalDurationMs, 'morphing')
    schedule(card.signalDurationMs + card.morphDurationMs, 'success')
    schedule(card.signalDurationMs + card.morphDurationMs + card.successHoldMs, 'resetting')
    schedule(card.signalDurationMs + card.morphDurationMs + card.successHoldMs + card.resetDurationMs, 'settling')
    schedule(card.signalDurationMs + card.morphDurationMs + card.successHoldMs + card.resetDurationMs + card.settleDurationMs, 'idle')
    const glowTimer = window.setTimeout(() => {
      setGlowEnabled(true)
      timersRef.current = timersRef.current.filter(current => current !== glowTimer)
    }, card.signalDurationMs + card.morphDurationMs + card.successHoldMs + card.resetDurationMs + card.settleDurationMs + 360)
    timersRef.current.push(glowTimer)
  }

  function handlePointerDown() {
    if (phase !== 'idle') return
    setPhase('pressed')
  }

  function handlePointerCancel() {
    setPhase(current => (current === 'pressed' ? 'idle' : current))
  }

  function handleActivate() {
    if (phase !== 'idle' && phase !== 'pressed') return

    clearTimers()

    if (phase === 'pressed') {
      const timer = window.setTimeout(() => {
        runSuccessFlow()
        timersRef.current = timersRef.current.filter(current => current !== timer)
      }, card.pressDurationMs)
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
    ? card.morphDurationMs
    : isResetting
      ? card.resetDurationMs
      : isSettling
        ? card.settleDurationMs
        : 180
  const transitionTimingFunction = isMorphing ? card.morphEase : isResetting || isSettling ? card.resetEase : 'ease-out'
  const currentBackgroundImage = isMorphing || isSuccess ? card.successBackgroundImage : card.baseBackgroundImage
  const currentShadowClassName = isMorphing || isSuccess ? card.successShadowClassName : card.baseShadowClassName
  const shouldHideLabel = isSignal || isMorphing || isSuccess
  const shouldShowSignal = isSignal
  const shouldShowCheck = isSuccess || isMorphing
  const currentBorderRadiusPx = isCompact
    ? card.compactRadiusPx
    : isPressed
      ? card.pressedRadiusPx
      : isResetting
        ? card.resettingRadiusPx
        : isSettling
          ? card.settlingRadiusPx
          : card.idleRadiusPx

  return (
    <div className="grid gap-5 rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(250,244,255,0.78))] p-5 shadow-[0_16px_50px_rgba(73,31,105,0.08)] lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div className="flex min-h-[280px] items-center justify-center rounded-[24px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.92),rgba(248,240,255,0.9)_42%,rgba(242,231,252,0.95))] p-6 shadow-inner">
        <div className="flex min-h-[120px] w-full max-w-[336px] items-center justify-center overflow-visible">
          <button
            type="button"
            onPointerDown={handlePointerDown}
            onPointerUp={() => {}}
            onPointerLeave={handlePointerCancel}
            onPointerCancel={handlePointerCancel}
            onClick={handleActivate}
            disabled={isLocked}
            aria-live="polite"
            aria-label={isSuccess ? 'Успешно' : 'Смотреть демо'}
            style={{
              backgroundImage: currentBackgroundImage,
              borderRadius: `${currentBorderRadiusPx}px`,
              transitionDuration: `${transitionDurationMs}ms`,
              transitionTimingFunction,
            }}
            className={[
              'button-demo relative inline-flex h-[92px] items-center justify-center overflow-hidden text-[24px] font-semibold tracking-[-0.03em] text-white outline-none transition-[width,transform,box-shadow,border-radius,background-image,background-color] disabled:cursor-default',
              currentShadowClassName,
              isCompact ? 'w-[92px] px-0' : 'w-full px-10',
              glowEnabled && !isPressed && !isSignal && !isMorphing && !isSuccess && !isResetting && !isSettling ? card.idleGlowClassName : '',
              isPressed ? card.pressedClassName : '',
              isMorphing ? card.morphTransformClassName : '',
              isSuccess ? card.successTransformClassName : '',
              isResetting ? card.resetTransformClassName : '',
              isSettling ? 'translate-y-0 scale-100' : '',
            ].join(' ')}
          >
            <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),transparent_42%,rgba(110,24,164,0.14)_100%)]" />
            <span className="pointer-events-none absolute inset-x-[18%] top-0 h-px bg-white/70 blur-[1px]" />
            <span
              className={[
                'pointer-events-none absolute inset-y-[14%] left-[-28%] z-[1] w-[34%] rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.02),rgba(255,255,255,0.62),rgba(255,255,255,0.06))] opacity-0 blur-[3px]',
                shouldShowSignal ? card.signalClassName : '',
              ].join(' ')}
              aria-hidden="true"
            />

            <span
              className={[
                'relative z-10 whitespace-nowrap transition-all ease-out',
                shouldHideLabel ? 'translate-y-2 scale-90 opacity-0' : '',
                isResetting || isSettling ? 'translate-y-0 scale-100 opacity-100 delay-75' : '',
              ].join(' ')}
              style={{ transitionDuration: `${card.labelExitDurationMs}ms` }}
            >
              Смотреть демо →
            </span>

            <span
              className={[
                'absolute inset-0 z-10 flex items-center justify-center opacity-0',
                shouldShowCheck ? card.checkRevealClassName : '',
              ].join(' ')}
              style={{
                animationDelay: shouldShowCheck ? `${isMorphing ? card.checkRevealDelayMs : 0}ms` : undefined,
              }}
              aria-hidden="true"
            >
              <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none">
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
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#9f73c7]">
            {card.label}
          </p>
          <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.04em] text-[#27152f]">
            {card.title}
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-[#5d4b67]">
            {card.blurb}
          </p>
        </div>

        <div className="rounded-[22px] border border-white/80 bg-white/80 p-4 shadow-sm">
          <p className="text-[14px] leading-6 text-[#4d3d57]">{card.details}</p>
          <p className="mt-3 text-[13px] text-[#8e7b99]">{card.successTone}</p>
        </div>

        <button
          type="button"
          onClick={handleActivate}
          disabled={isLocked}
          className="inline-flex items-center justify-center rounded-full bg-[#27152f] px-4 py-2.5 text-[14px] font-medium text-white transition hover:bg-[#3a2146] disabled:cursor-default disabled:opacity-40"
        >
          Повторить success-flow
        </button>
      </div>
    </div>
  )
}

export default function ButtonPlaygroundPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(212,165,255,0.28),transparent_28%),linear-gradient(180deg,#fcf8ff_0%,#f4eefb_100%)] px-5 py-10 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#9f73c7]">
              Button Playground
            </p>
            <h1 className="text-[30px] font-semibold tracking-[-0.04em] text-[#27152f] sm:text-[42px]">
              Тестовая страница для анимации нажатия
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#6b5876]">
              Здесь оставлен один гибридный вариант, чтобы точечно допиливать только его: морф в круг, success-цвет, галочку и обратный разворот в CTA.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-[14px] font-medium text-[#6c47a7] shadow-sm backdrop-blur transition hover:bg-white"
          >
            На главную
          </Link>
        </div>

        <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white/60 p-6 shadow-[0_24px_80px_rgba(94,45,140,0.12)] backdrop-blur sm:p-10">
          <DemoButtonCard card={FOCUSED_CARD} />
        </section>
      </div>
    </main>
  )
}
