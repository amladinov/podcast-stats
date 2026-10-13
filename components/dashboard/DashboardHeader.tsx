'use client'

import { SafePodcastImage } from '@/components/SafePodcastImage'
import { getCtaClasses } from '@/lib/ctaStyles'
import { PLATFORMS } from '@/lib/platforms'
import type { Platform } from '@/types'

interface Props {
  podcastTitle: string
  podcastImageUrl: string
  isDemo: boolean
  uploadedPlatforms: Set<Platform>
  hasEpisodes: boolean
  onBack: () => void
  onPrintPdf: () => void
  onCompare: () => void
  onAddData: () => void
}

/** Десктопная шапка дашборда: обложка, название, плашки платформ, действия. */
export function DashboardHeader({
  podcastTitle,
  podcastImageUrl,
  isDemo,
  uploadedPlatforms,
  hasEpisodes,
  onBack,
  onPrintPdf,
  onCompare,
  onAddData,
}: Props) {
  return (
    <div className="bg-white border-b border-[#e5e5ea] print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-start sm:items-center gap-3">
        <button onClick={onBack} className="text-[#b150e2] text-[14px] font-medium hover:opacity-70 transition-opacity flex-shrink-0">
          ← Назад
        </button>
        {podcastImageUrl && (
          <SafePodcastImage src={podcastImageUrl} alt={podcastTitle} width={36} height={36} className="rounded-xl object-cover shadow-sm flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0 basis-[calc(100%-52px)] sm:basis-auto">
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] sm:text-[17px] font-semibold text-[#1d1d1f] truncate">{podcastTitle}</h1>
            {isDemo && (
              <span className="text-[10px] font-semibold bg-[#b150e2]/10 text-[#b150e2] px-1.5 py-0.5 rounded-md border border-[#b150e2]/20 flex-shrink-0">
                ДЕМО
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            {isDemo && <span className="text-[11px] text-[#aeaeb2]">Демо-данные ·</span>}
            {PLATFORMS.map(platform => {
              const isUploaded = uploadedPlatforms.has(platform.key)

              return (
                <span
                  key={platform.key}
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                  style={isUploaded
                    ? {
                        background: platform.color + '20',
                        color: platform.color,
                        border: `1px solid ${platform.color}40`,
                      }
                    : {
                        background: '#f5f5f7',
                        color: '#aeaeb2',
                        border: '1px solid #d2d2d7',
                        textDecoration: 'line-through',
                        textDecorationThickness: '1.5px',
                      }}
                >
                  {platform.label}
                </span>
              )
            })}
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {hasEpisodes && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 sm:flex-none">
              <button
                onClick={onPrintPdf}
                className={`${getCtaClasses({ tone: 'dark', size: 'compact' })} flex-1 sm:flex-none`}
              >
                Экспорт в PDF
              </button>
              <p className="text-[11px] text-[#8e8e93] sm:max-w-[220px] leading-[1.35]">
                Перед сохранением PDF отключи `Headers and footers` в окне печати браузера.
              </p>
            </div>
          )}
          <button
            onClick={onCompare}
            className={`${getCtaClasses({ tone: 'secondary', size: 'compact' })} flex-1 text-[#6e6e73] sm:flex-none`}
          >
            Сравнить
          </button>
          <button
            onClick={onAddData}
            className={`${getCtaClasses({ tone: 'secondary', size: 'compact' })} flex-1 sm:flex-none`}
          >
            + Данные
          </button>
        </div>
      </div>
    </div>
  )
}
