'use client'

import type { YandexAudience } from '@/types'
import { getCtaClasses } from '@/lib/ctaStyles'
import { Spinner } from './Spinner'
import type { AudienceType } from './useAudienceUpload'

export type SetupLayout = 'mobile' | 'desktop'

interface Props {
  layout: SetupLayout
  yandexAudience: YandexAudience | undefined
  audienceUploading: string | null
  audienceErrors: Record<string, string>
  audienceDone: Record<string, boolean>
  onFile: (type: AudienceType, file: File) => void
}

const CARD_DEFS: Array<{ type: AudienceType; label: string; desc: string }> = [
  { type: 'gender', label: 'Аудитория: Пол', desc: 'C14. Пол слушателей — из DataLens' },
  { type: 'age', label: 'Аудитория: Возраст', desc: 'C15. Возраст слушателей — из DataLens' },
  { type: 'cities', label: 'Аудитория: Города', desc: 'C19. Статистика по городам — из DataLens' },
]

/** Три опциональные карточки аудитории Яндекс Музыки (пол, возраст, города). */
export function AudienceCards({ layout, yandexAudience, audienceUploading, audienceErrors, audienceDone, onFile }: Props) {
  const desktop = layout === 'desktop'
  const cards = CARD_DEFS.map(card => ({
    ...card,
    isDone: audienceDone[card.type] || !!yandexAudience?.[card.type],
    isUploading: audienceUploading === card.type,
    err: audienceErrors[card.type],
  }))

  return (
    <div className={desktop ? 'pl-4 ml-1 border-l-2 border-[#ff9f0a]/40 space-y-2' : 'space-y-2'}>
      {cards.map(card => (
        <div
          key={card.type}
          className="bg-white rounded-xl p-3 border border-[#e5e5ea] shadow-sm"
        >
          <div className={desktop ? 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between' : 'flex flex-col gap-3'}>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-medium text-[#1d1d1f]">{card.label}</span>
                <span className="text-[10px] text-[#aeaeb2] bg-[#f5f5f7] px-1.5 py-0.5 rounded-full border border-[#e5e5ea]">Опционально</span>
                {card.isDone && (
                  <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full font-medium border border-green-100">✓ Готово</span>
                )}
              </div>
              <p className="text-[#aeaeb2] text-[11px] mt-0.5">{card.desc}</p>
              <p className="text-[#aeaeb2] text-[11px] mt-0.5">Выгружай за весь период (убери фильтр по датам в DataLens)</p>
              {card.err && <p className="text-red-500 text-[11px] mt-1">{card.err}</p>}
            </div>
            <label className={desktop ? 'w-full min-w-0 cursor-pointer sm:w-auto sm:flex-none' : 'w-full min-w-0 cursor-pointer'}>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) onFile(card.type, file)
                  e.target.value = ''
                }}
                disabled={audienceUploading !== null}
              />
              <span className={`${getCtaClasses({ tone: 'secondary', size: 'compact', fullWidth: true })} min-w-0 text-[12px]${desktop ? ' sm:w-auto' : ''} ${
                audienceUploading !== null ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#e5e5ea]'
              }`}>
                {card.isUploading ? (
                  <>
                    <Spinner size="sm" />
                    Обрабатываю...
                  </>
                ) : card.isDone ? 'Заменить' : 'Выбрать CSV'}
              </span>
            </label>
          </div>
        </div>
      ))}
    </div>
  )
}
