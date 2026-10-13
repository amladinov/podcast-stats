'use client'

import type { DragEvent } from 'react'
import type { Podcast } from '@/types'
import { getCtaClasses } from '@/lib/ctaStyles'
import { formatPeriod, getEpisodeRangeFromNormalized, getPeriodFromPlays } from '@/lib/platformPeriods'
import { Spinner } from './Spinner'
import { GuideSteps } from './GuideSteps'
import { MavePasteSection, type MavePasteState } from './MavePasteSection'
import type { SetupLayout } from './AudienceCards'
import type { CsvPlatform, SetupPlatform } from './platformGuides'

export interface PlatformCardUploadState {
  uploading: string | null
  errors: Record<string, string>
  previews: Record<string, number>
  lastUploadedKey: string | null
  dragOver: string | null
  openGuide: string | null
  uploadedKeys: Set<string>
  totalPlatforms: number
  onDragOver: (key: CsvPlatform | null) => void
  onToggleGuide: (key: CsvPlatform) => void
  onFile: (key: CsvPlatform, file: File) => void
}

interface Props {
  layout: SetupLayout
  platform: SetupPlatform
  podcast: Podcast
  upload: PlatformCardUploadState
  /** Только для карточки Mave */
  mavePaste?: MavePasteState
}

/** Карточка CSV-платформы: статус, кнопка выбора файла, инструкция, для Mave ещё и вставка текста. */
export function PlatformCard({ layout, platform: p, podcast, upload, mavePaste }: Props) {
  const desktop = layout === 'desktop'
  const uploaded = podcast.uploadedPlatforms.find(u => u.platform === p.key)
  const fallbackPeriod = getPeriodFromPlays(podcast.rawPlays.filter(play => play.platform === p.key))
  const currentPeriod = formatPeriod(
    uploaded?.periodStart ?? fallbackPeriod.periodStart,
    uploaded?.periodEnd ?? fallbackPeriod.periodEnd
  )
  const yandexEpisodeRange = p.key === 'yandex'
    ? getEpisodeRangeFromNormalized(podcast.normalized, 'yandex')
    : {}
  const yandexEpisodesLabel = p.key === 'yandex'
    ? formatPeriod(yandexEpisodeRange.periodStart, yandexEpisodeRange.periodEnd)
    : null
  const preview = upload.previews[p.key]
  const err = upload.errors[p.key]
  const anyUploading = upload.uploading !== null
  const isUploading = upload.uploading === p.key
  const isDone = upload.uploadedKeys.has(p.key) || !!preview
  const isBlocked = anyUploading && !isUploading
  const showHint = upload.lastUploadedKey === p.key && upload.uploadedKeys.size < upload.totalPlatforms && !anyUploading
  const isGuideOpen = upload.openGuide === p.key
  const isMavePaste = p.key === 'mave' && uploaded?.sourceKind === 'paste'
  const hasMaveCsvTimeline = p.key === 'mave' && (uploaded?.sourceKind === 'csv' || uploaded?.timelineSourceKind === 'csv')

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    upload.onDragOver(null)
    if (!anyUploading) {
      const file = e.dataTransfer.files?.[0]
      if (file) upload.onFile(p.key, file)
    }
  }

  const header = (
    <div className="flex items-start gap-3 min-w-0">
      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.dot }} />
      <div className={desktop ? 'min-w-0' : 'min-w-0 flex-1'}>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-[#1d1d1f] text-[15px]">{p.label}</h3>
          {p.key === 'mave' && (
            <span className="text-[10px] bg-[#f5f5f7] text-[#6e6e73] px-2 py-0.5 rounded-full font-medium border border-[#e5e5ea]">
              Основной способ
            </span>
          )}
          {isDone && (
            <span className="text-[11px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium border border-green-100">
              ✓ Готово
            </span>
          )}
        </div>
        <p className="text-[#aeaeb2] text-[12px] mt-0.5">{p.desc}</p>
        <button
          onClick={() => upload.onToggleGuide(p.key)}
          className="flex items-center gap-1 text-[#b150e2] text-[12px] mt-1 hover:opacity-70 transition-opacity"
        >
          Как скачать CSV?
          <span
            className="inline-block transition-transform duration-300"
            style={{ transform: isGuideOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            ↓
          </span>
        </button>
        {uploaded && !preview && (
          <p className="text-[#aeaeb2] text-[11px] mt-1">{uploaded.fileName} · {uploaded.recordsCount.toLocaleString('ru')} записей</p>
        )}
        {preview && (
          <p className="text-green-600 text-[11px] mt-1">{preview.toLocaleString('ru')} записей</p>
        )}
        {p.key === 'mave' && uploaded?.sourceKind && (
          <p className="text-[#6e6e73] text-[11px] mt-1">
            {isMavePaste
              ? 'Актуальные значения: из вставки текста'
              : 'Основной источник Mave: CSV'}
            {isMavePaste && hasMaveCsvTimeline ? ' · динамика сохранена из CSV' : ''}
          </p>
        )}
        {currentPeriod && (
          <p className="text-[#6e6e73] text-[11px] mt-1">Период: {currentPeriod}</p>
        )}
        {!currentPeriod && yandexEpisodesLabel && (
          <p className="text-[#6e6e73] text-[11px] mt-1">Выпуски: {yandexEpisodesLabel}</p>
        )}
        {err && <p className="text-red-500 text-[12px] mt-1">{err}</p>}
      </div>
    </div>
  )

  const fileButton = (
    <div className={desktop ? 'flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-shrink-0' : 'flex w-full min-w-0 items-center gap-2'}>
      {isDone && !isUploading && (
        <span className="animate-pop text-green-500 text-[18px] leading-none">✓</span>
      )}
      <label className={`min-w-0 flex-1${desktop ? ' sm:w-auto sm:flex-none' : ''} ${isBlocked ? 'pointer-events-none' : 'cursor-pointer'}`}>
        <input
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) upload.onFile(p.key, file)
            e.target.value = ''
          }}
          disabled={anyUploading}
        />
        <span className={`${getCtaClasses({ tone: 'secondary', size: 'compact', fullWidth: true })} min-w-0${desktop ? ' sm:w-auto' : ''} ${
          isBlocked
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-[#e5e5ea]'
        }`}>
          {isUploading ? (
            <>
              <Spinner />
              Обрабатываю...
            </>
          ) : isDone ? 'Заменить' : 'Выбрать CSV'}
        </span>
      </label>
    </div>
  )

  const extras = (
    <>
      <GuideSteps platformKey={p.key} open={isGuideOpen} guide={p.guide} note={'note' in p ? p.note : undefined} maxHeight={desktop ? 400 : 420} />

      {p.key === 'mave' && mavePaste && (
        <MavePasteSection layout={layout} state={mavePaste} anyUploading={anyUploading} />
      )}

      {showHint && (
        <p className={desktop ? 'text-[#aeaeb2] text-[12px] mt-3' : 'text-[#aeaeb2] text-[12px]'}>→ Загрузи следующий источник</p>
      )}
    </>
  )

  return (
    <div
      className={`bg-white rounded-2xl p-5 border shadow-sm transition-all duration-200 ${
        isUploading
          ? 'border-[#b150e2] animate-pulse'
          : upload.dragOver === p.key
            ? 'border-dashed border-[#b150e2] bg-[#b150e2]/5 scale-[1.01]'
            : 'border-[#e5e5ea]'
      }`}
      onDragOver={e => { if (!anyUploading) { e.preventDefault(); upload.onDragOver(p.key) } }}
      onDragLeave={() => upload.onDragOver(null)}
      onDrop={handleDrop}
    >
      {desktop ? (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {header}
            {fileButton}
          </div>
          {extras}
        </>
      ) : (
        <div className="flex flex-col gap-4">
          {header}
          {fileButton}
          {extras}
        </div>
      )}
    </div>
  )
}
