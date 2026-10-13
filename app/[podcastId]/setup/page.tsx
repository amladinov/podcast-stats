'use client'

import { useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { SafePodcastImage } from '@/components/SafePodcastImage'
import { usePodcastStore } from '@/lib/store'
import { getCtaClasses } from '@/lib/ctaStyles'
import { PLATFORM_BY_KEY } from '@/lib/platforms'
import { useMobileScenes } from '@/lib/hooks/useMobileScenes'
import {
  MOBILE_SETUP_PLATFORM_ORDER,
  MOBILE_SETUP_SCENES,
  SETUP_PLATFORMS,
  type CsvPlatform,
} from '@/components/setup/platformGuides'
import { PlatformCard, type PlatformCardUploadState } from '@/components/setup/PlatformCard'
import { AudienceCards } from '@/components/setup/AudienceCards'
import { YouTubeCard } from '@/components/setup/YouTubeCard'
import { SetupFinishScene } from '@/components/setup/SetupFinishScene'
import { SetupMobileShell } from '@/components/setup/SetupMobileShell'
import type { MavePasteState } from '@/components/setup/MavePasteSection'
import { useSetupUploads } from '@/components/setup/useSetupUploads'
import { useMavePaste } from '@/components/setup/useMavePaste'
import { useAudienceUpload } from '@/components/setup/useAudienceUpload'
import { useYouTubeSetupCallback } from '@/components/setup/useYouTubeSetupCallback'

export default function SetupPage() {
  const { podcastId } = useParams<{ podcastId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const podcast = usePodcastStore(s => s.getPodcast(podcastId))
  const uploadPlays = usePodcastStore(s => s.uploadPlays)
  const refreshEpisodes = usePodcastStore(s => s.refreshEpisodes)
  const uploadYandexAudience = usePodcastStore(s => s.uploadYandexAudience)

  // ---- Состояние загрузок ----
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [openGuide, setOpenGuide] = useState<string | null>(null)
  const uploads = useSetupUploads({ podcastId, uploadPlays })
  const { uploading, errors, previews, lastUploadedKey, setUploading, setErrors, setPreviews, setLastUploadedKey, handleFile } = uploads
  const { youtubeLoading } = useYouTubeSetupCallback({ podcastId, searchParams, uploadPlays, setErrors, setPreviews, setLastUploadedKey })
  const mave = useMavePaste({ podcastId, podcast, uploadPlays, refreshEpisodes, setUploading, setPreviews, setLastUploadedKey })
  const { audienceUploading, audienceErrors, audienceDone, handleAudienceFile } = useAudienceUpload({ podcastId, uploadYandexAudience })

  // ---- Мобильные сцены ----
  // Любое изменение статусов меняет высоту шапки/контента, поэтому перемеряем.
  const remeasureKey = JSON.stringify([
    mave.maveTutorialOpen, openGuide, previews, errors, audienceDone, audienceErrors, uploading, audienceUploading, youtubeLoading,
  ])
  const mobile = useMobileScenes({
    totalScenes: MOBILE_SETUP_SCENES.length,
    remeasureKey,
    decisiveSwipe: false,
    wrapAround: false,
    measureVisualViewport: false,
  })

  if (!podcast) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-[#6e6e73]">Подкаст не найден</p>
        <button onClick={() => router.push('/')} className="mt-4 text-[#b150e2] text-sm hover:underline">На главную</button>
      </main>
    )
  }

  const uploadedKeys = new Set(podcast.uploadedPlatforms.map(u => u.platform))
  const anyUploading = uploading !== null
  const goHome = () => router.push('/')
  const goToDashboard = () => router.push(`/${podcastId}/dashboard`)

  const uploadState: PlatformCardUploadState = {
    uploading,
    errors,
    previews,
    lastUploadedKey,
    dragOver,
    openGuide,
    uploadedKeys,
    totalPlatforms: SETUP_PLATFORMS.length,
    onDragOver: setDragOver,
    onToggleGuide: (key: CsvPlatform) => setOpenGuide(prev => prev === key ? null : key),
    onFile: handleFile,
  }

  const mavePasteState: MavePasteState = {
    text: mave.mavePasteText,
    preview: mave.mavePastePreview,
    warnings: mave.mavePasteWarnings,
    error: mave.mavePasteError,
    tutorialOpen: mave.maveTutorialOpen,
    alternativeOpen: mave.isMaveAlternativeOpen,
    onTextChange: mave.handleTextChange,
    onToggleTutorial: () => mave.setMaveTutorialOpen(prev => !prev),
    onToggleAlternative: () => mave.setIsMaveAlternativeOpen(prev => !prev),
    onPreview: mave.handleMavePastePreview,
    onImport: mave.handleMavePasteImport,
  }

  const ytDone = uploadedKeys.has('youtube') || !!previews['youtube']

  const renderAudienceCards = (layout: 'mobile' | 'desktop') => (
    <AudienceCards
      layout={layout}
      yandexAudience={podcast.yandexAudience}
      audienceUploading={audienceUploading}
      audienceErrors={audienceErrors}
      audienceDone={audienceDone}
      onFile={handleAudienceFile}
    />
  )

  const renderYouTubeCard = (layout: 'mobile' | 'desktop') => (
    <YouTubeCard
      layout={layout}
      podcast={podcast}
      podcastId={podcastId}
      preview={previews['youtube']}
      error={errors['youtube']}
      isDone={ytDone}
      anyUploading={anyUploading}
      youtubeLoading={youtubeLoading}
    />
  )

  const mobilePlatformStatuses = MOBILE_SETUP_PLATFORM_ORDER.map(key => ({
    key,
    label: PLATFORM_BY_KEY[key].label,
    isDone: uploadedKeys.has(key),
    isCurrent: MOBILE_SETUP_SCENES[mobile.sceneIndex]?.id === key,
  }))

  const mobileSetupStepMap = [
    ...mobilePlatformStatuses,
    {
      key: 'done' as const,
      label: 'Итог',
      isDone: uploadedKeys.size > 0,
      isCurrent: MOBILE_SETUP_SCENES[mobile.sceneIndex]?.id === 'done',
    },
  ]

  const renderMobileScene = (sceneId: string) => {
    if (sceneId === 'youtube') return renderYouTubeCard('mobile')
    if (sceneId === 'done') {
      return (
        <SetupFinishScene
          statuses={mobilePlatformStatuses}
          canOpenDashboard={uploadedKeys.size > 0}
          onOpenDashboard={goToDashboard}
        />
      )
    }

    const platform = SETUP_PLATFORMS.find(item => item.key === sceneId)!
    return (
      <div className="space-y-3">
        <PlatformCard
          layout="mobile"
          platform={platform}
          podcast={podcast}
          upload={uploadState}
          mavePaste={platform.key === 'mave' ? mavePasteState : undefined}
        />
        {platform.key === 'yandex' && renderAudienceCards('mobile')}
      </div>
    )
  }

  const desktopWidth = mave.maveTutorialOpen ? 'max-w-4xl' : 'max-w-2xl'

  return (
    <>
    <SetupMobileShell
      scenes={MOBILE_SETUP_SCENES}
      activeSceneIndex={mobile.sceneIndex}
      viewportHeight={mobile.viewportHeight}
      sceneViewportHeight={mobile.sceneViewportHeight}
      chromeRef={mobile.chromeRef}
      sceneContentRefs={mobile.sceneContentRefs}
      onTouchStart={mobile.onTouchStart}
      onTouchEnd={mobile.onTouchEnd}
      podcastTitle={podcast.title}
      podcastImageUrl={podcast.imageUrl}
      episodesCount={podcast.episodes.length}
      steps={mobileSetupStepMap}
      onBack={goHome}
      renderScene={renderMobileScene}
    />

    <div className="hidden md:block min-h-screen bg-[#f5f5f7]">
      <div className="bg-white border-b border-[#e5e5ea] transition-all duration-500">
        <div className={`mx-auto px-4 sm:px-6 py-4 flex items-center gap-4 transition-all duration-500 ${desktopWidth}`}>
          <button onClick={goHome} className="text-[#b150e2] text-[14px] font-medium hover:opacity-70 transition-opacity">
            ← Назад
          </button>
          {podcast.imageUrl && (
            <SafePodcastImage src={podcast.imageUrl} alt={podcast.title} width={36} height={36} className="rounded-lg object-cover shadow-sm" />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] font-semibold text-[#1d1d1f] truncate">{podcast.title}</h1>
            <p className="text-[#6e6e73] text-[12px]">{podcast.episodes.length} эпизодов</p>
          </div>
        </div>
      </div>

      <main className={`mx-auto px-4 sm:px-6 py-8 transition-all duration-500 ${desktopWidth}`}>
        <p className="text-[#6e6e73] text-[14px] mb-6">
          Загрузи статистику с платформ. CSV-файлы или подключение через аккаунт.
        </p>

        <div className="space-y-3">
          {SETUP_PLATFORMS.map(platform => (
            <div key={platform.key}>
              <PlatformCard
                layout="desktop"
                platform={platform}
                podcast={podcast}
                upload={uploadState}
                mavePaste={platform.key === 'mave' ? mavePasteState : undefined}
              />
              {platform.key === 'yandex' && renderAudienceCards('desktop')}
            </div>
          ))}

          {/* YouTube card — OAuth instead of CSV */}
          {renderYouTubeCard('desktop')}
        </div>

        {/* Hint about consistent periods */}
        <p className="text-[12px] text-[#aeaeb2] text-center mt-4">
          💡 Для точной статистики выгружай данные за одинаковый период со всех платформ
        </p>

        {uploadedKeys.size > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={goToDashboard}
              className={`${getCtaClasses({ tone: 'primary' })} px-8 text-[15px] font-semibold`}
            >
              Открыть дашборд
            </button>
          </div>
        )}
      </main>
    </div>
    </>
  )
}
