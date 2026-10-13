'use client'

import type { ReactNode } from 'react'
import type { RefreshMessage } from './useYouTubeRefresh'

interface Props {
  dotColor: string
  title: string
  subtitle: ReactNode
  message: RefreshMessage
  refreshing: boolean
  /** Классы кнопки в активном состоянии (цвет рамки/текста под платформу) */
  activeClassName: string
  actionLabel: string
  /** Кнопка (onClick) или ссылка (href), например на OAuth-редирект */
  onClick?: () => void
  href?: string
}

const BUTTON_BASE = 'inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-1.5 text-[13px] font-medium transition-colors'
const BUTTON_DISABLED = 'cursor-not-allowed border-[#e5e5ea] bg-[#f5f5f7] text-[#aeaeb2]'

/** Панель «обновить данные» над дашбордом: точка платформы, подпись, статус и кнопка. */
export function RefreshPanel({ dotColor, title, subtitle, message, refreshing, activeClassName, actionLabel, onClick, href }: Props) {
  const buttonClassName = [BUTTON_BASE, refreshing ? BUTTON_DISABLED : activeClassName].join(' ')
  const content = refreshing ? (
    <>
      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#aeaeb2] border-t-transparent" />
      Обновляем…
    </>
  ) : (
    <>{actionLabel}</>
  )

  return (
    <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-2xl border border-[#e5e5ea] bg-white px-4 py-3 shadow-sm print:hidden">
      <div className="min-w-0 flex flex-col">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: dotColor }} />
          <p className="text-[13px] font-semibold text-[#1d1d1f]">{title}</p>
          <p className="text-[12px] text-[#8e8e93]">{subtitle}</p>
        </div>
        {message && (
          <p
            className={[
              'mt-1 text-[12px]',
              message.type === 'success' ? 'text-[#30a14e]' : 'text-[#d70015]',
            ].join(' ')}
          >
            {message.text}
          </p>
        )}
      </div>
      {href !== undefined ? (
        <a
          href={refreshing ? undefined : href}
          aria-disabled={refreshing}
          className={buttonClassName}
        >
          {content}
        </a>
      ) : (
        <button
          onClick={onClick}
          disabled={refreshing}
          className={buttonClassName}
        >
          {content}
        </button>
      )}
    </div>
  )
}
