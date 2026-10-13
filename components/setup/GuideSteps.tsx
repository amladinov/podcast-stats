'use client'

import type { GuideStep } from './platformGuides'

interface Props {
  platformKey: string
  open: boolean
  guide: GuideStep[]
  note?: string
  /** Мобильная карточка раскрывается на 420px, десктопная на 400px */
  maxHeight: number
}

/** Раскрывающаяся инструкция «Как скачать CSV?» */
export function GuideSteps({ platformKey, open, guide, note, maxHeight }: Props) {
  return (
    <div
      className="overflow-hidden transition-all duration-500 ease-in-out border-t border-transparent mt-2"
      style={{ maxHeight: open ? `${maxHeight}px` : '0px' }}
    >
      <div className="mt-3 bg-[#f5f5f7] rounded-xl p-3">
        <ol className="space-y-1.5 list-decimal list-inside">
          {guide.map((step, i) => (
            <li key={`${platformKey}-${i}`} className="text-[12px] text-[#3d3d3f] leading-relaxed">
              {step.map((part, j) =>
                part.t === 'link'
                  ? (
                    <a
                      key={j}
                      href={part.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#b150e2] underline underline-offset-2 hover:opacity-70 transition-opacity"
                      onClick={e => e.stopPropagation()}
                    >
                      {part.label}
                    </a>
                  )
                  : <span key={j}>{part.v}</span>
              )}
            </li>
          ))}
        </ol>
        {note && (
          <p className="text-[11px] text-[#6e6e73] mt-2 pt-2 border-t border-[#e5e5ea]">{note}</p>
        )}
      </div>
    </div>
  )
}
