'use client'

import { getCtaClasses } from '@/lib/ctaStyles'

interface Props {
  totalScenes: number
  total: number
  averagePerEpisode: number
  episodesCount: number
  uploadedPlatformLabels: string[]
  pdfGenerating: boolean
  pdfError: string | null
  canCompare: boolean
  onPrintPdf: () => void
  onCompare: () => void
  onAddData: () => void
}

export function MobileOverviewScene({
  totalScenes,
  total,
  averagePerEpisode,
  episodesCount,
  uploadedPlatformLabels,
  pdfGenerating,
  pdfError,
  canCompare,
  onPrintPdf,
  onCompare,
  onAddData,
}: Props) {
  return (
    <div className="h-full">
      <div className="flex h-full min-h-0 flex-col rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,244,255,0.94)_48%,rgba(247,249,255,0.97))] px-4 py-4 shadow-[0_18px_38px_rgba(29,29,31,0.07)]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#7b57c8] shadow-sm">
            Dashboard
          </div>
          <h2 className="mt-3 text-[25px] font-bold leading-[0.95] tracking-tight text-[#1d1d1f]">
            Вся картина
            <br /> по подкасту
            <br /> на {totalScenes} экранах
          </h2>
          <p className="mt-2.5 max-w-[280px] text-[13px] leading-snug text-[#4a4a52]">
            Свайпай вверх: сводка, графики, эпизоды.
          </p>
        </div>

        <div className="flex flex-1 flex-col justify-center">
          {total > 0 ? (
            <div className="rounded-[22px] bg-gradient-to-br from-[#7b57c8] to-[#9b6fe3] px-5 py-5 text-center shadow-[0_12px_28px_rgba(123,87,200,0.25)]">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/70">Всего прослушиваний</p>
              <p className="mt-2 text-[40px] font-bold leading-none text-white">{total.toLocaleString('ru')}</p>
              <p className="mt-1.5 text-[13px] text-white/60">ср. {averagePerEpisode.toLocaleString('ru')} / эп.</p>
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-[#d4c4f0] bg-[#f8f4ff] px-5 py-5 text-center">
              <p className="text-[14px] font-medium text-[#7b57c8]">Загрузите CSV</p>
              <p className="mt-1 text-[12px] text-[#8e8e93]">чтобы увидеть статистику</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[22px] border border-[#efe5ff] bg-white/82 px-4 py-3 shadow-[0_10px_24px_rgba(177,80,226,0.05)]">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#8e8e93]">Эпизоды</p>
            <p className="mt-1.5 text-[22px] font-semibold leading-none text-[#1d1d1f]">{episodesCount}</p>
            <p className="mt-1 text-[11px] text-[#8e8e93]">выпусков</p>
          </div>
          <div className="rounded-[22px] border border-[#efe5ff] bg-white/82 px-4 py-3 shadow-[0_10px_24px_rgba(177,80,226,0.05)]">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#8e8e93]">Платформы</p>
            <p className="mt-1.5 text-[22px] font-semibold leading-none text-[#1d1d1f]">{uploadedPlatformLabels.length}</p>
            <p className="mt-1 truncate text-[11px] text-[#8e8e93]">{uploadedPlatformLabels.join(', ') || '—'}</p>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={onPrintPdf}
            disabled={pdfGenerating}
            className={getCtaClasses({ tone: 'dark', fullWidth: true, disabled: pdfGenerating })}
          >
            {pdfGenerating ? 'Готовим PDF…' : 'Экспорт в PDF'}
          </button>
          {pdfError && (
            <p className="mt-2 text-[12px] text-[#d70015]">{pdfError}</p>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={onCompare}
              disabled={!canCompare}
              className={[
                getCtaClasses({
                  tone: 'secondary',
                  size: 'compact',
                  fullWidth: true,
                  disabled: !canCompare,
                }),
                'text-[13px] text-[#6e6e73]',
              ].join(' ')}
            >
              Сравнить
            </button>
            <button
              onClick={onAddData}
              className={`${getCtaClasses({ tone: 'secondary', size: 'compact', fullWidth: true })} text-[13px]`}
            >
              + Данные
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
