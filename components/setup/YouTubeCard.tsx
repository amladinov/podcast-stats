'use client'

import type { Podcast } from '@/types'
import { getCtaClasses } from '@/lib/ctaStyles'
import { formatPeriod, getPeriodFromPlays } from '@/lib/platformPeriods'
import { Spinner } from './Spinner'
import { YOUTUBE_PLATFORM } from './platformGuides'
import type { SetupLayout } from './AudienceCards'

interface Props {
  layout: SetupLayout
  podcast: Podcast
  podcastId: string
  preview: number | undefined
  error: string | undefined
  isDone: boolean
  anyUploading: boolean
  youtubeLoading: boolean
}

/** Карточка YouTube: подключение через Google OAuth вместо CSV. */
export function YouTubeCard({ layout, podcast, podcastId, preview, error, isDone, anyUploading, youtubeLoading }: Props) {
  const desktop = layout === 'desktop'
  const ytUploaded = podcast.uploadedPlatforms.find(u => u.platform === 'youtube')
  const ytFallbackPeriod = getPeriodFromPlays(podcast.rawPlays.filter(play => play.platform === 'youtube'))
  const ytPeriod = formatPeriod(
    ytUploaded?.periodStart ?? ytFallbackPeriod.periodStart,
    ytUploaded?.periodEnd ?? ytFallbackPeriod.periodEnd
  )
  const ytBlocked = anyUploading || youtubeLoading

  return (
    <div
      className={desktop
        ? `bg-white rounded-2xl p-5 border shadow-sm transition-all duration-200 ${youtubeLoading ? 'border-[#ff0000] animate-pulse' : 'border-[#e5e5ea]'}`
        : 'bg-white rounded-2xl p-5 border border-[#e5e5ea] shadow-sm'}
    >
      <div className={desktop ? 'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between' : 'flex flex-col gap-4'}>
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: YOUTUBE_PLATFORM.dot }} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-[#1d1d1f] text-[15px]">{YOUTUBE_PLATFORM.label}</h3>
              {isDone && (
                <span className="text-[11px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium border border-green-100">
                  ✓ Готово
                </span>
              )}
            </div>
            <p className="text-[#aeaeb2] text-[12px] mt-0.5">{YOUTUBE_PLATFORM.desc}</p>
            {ytUploaded && !preview && (
              <p className="text-[#aeaeb2] text-[11px] mt-1">{ytUploaded.recordsCount.toLocaleString('ru')} видео</p>
            )}
            {preview && (
              <p className="text-green-600 text-[11px] mt-1">{preview.toLocaleString('ru')} видео</p>
            )}
            {ytPeriod && (
              <p className="text-[#6e6e73] text-[11px] mt-1">Период: {ytPeriod}</p>
            )}
            {error && <p className="text-red-500 text-[12px] mt-1">{error}</p>}
          </div>
        </div>

        <div className={desktop ? 'flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-shrink-0' : 'flex w-full min-w-0 items-center gap-2'}>
          {isDone && !youtubeLoading && (
            <span className="animate-pop text-green-500 text-[18px] leading-none">✓</span>
          )}
          <a
            href={ytBlocked ? undefined : `/api/youtube/auth?podcastId=${podcastId}`}
            className={`${getCtaClasses({ tone: 'secondary', size: 'compact', fullWidth: true })} min-w-0 flex-1${desktop ? ' sm:w-auto sm:flex-none' : ''} ${
              ytBlocked
                ? 'opacity-50 cursor-not-allowed pointer-events-none'
                : 'hover:bg-[#e5e5ea]'
            }`}
          >
            {youtubeLoading ? (
              <>
                <Spinner />
                Подключаю...
              </>
            ) : isDone ? 'Переподключить' : 'Подключить YouTube'}
          </a>
        </div>
      </div>
    </div>
  )
}
