'use client'

import { useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { usePodcastStore } from '@/lib/store'
import { resolvePodcastCoverUrl } from '@/lib/podcastCover'
import { DEMO_IDS, DEMO_INSIGHTS_MAP } from '@/lib/demoData'
import { getFilteredEpisodes, getPlatformTotals, getTotalPlays } from '@/lib/podcastMetrics'
import { PLATFORMS } from '@/lib/platforms'
import { buildAudienceChartData, buildStatCardMeta, sortEpisodes, type EpisodeSortKey } from '@/lib/dashboardMetrics'
import { formatTimeAgo } from '@/lib/timeAgo'
import { useMobileScenes } from '@/lib/hooks/useMobileScenes'
import { StatCards } from '@/components/dashboard/StatCards'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { PlatformChart } from '@/components/dashboard/PlatformChart'
import { EpisodeTable } from '@/components/dashboard/EpisodeTable'
import { AIInsights } from '@/components/dashboard/AIInsights'
import { PlatformFilters } from '@/components/dashboard/PlatformFilters'
import { YandexAudienceSection } from '@/components/dashboard/YandexAudienceSection'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { RefreshPanel } from '@/components/dashboard/RefreshPanel'
import { DashboardPrintReport } from '@/components/dashboard/print/DashboardPrintReport'
import { MobileDashboardShell, type MobileScene } from '@/components/dashboard/mobile/MobileDashboardShell'
import { MobileOverviewScene } from '@/components/dashboard/mobile/MobileOverviewScene'
import { MobileSummaryScene } from '@/components/dashboard/mobile/MobileSummaryScene'
import { MobileEpisodesScene, type EpisodeListMode } from '@/components/dashboard/mobile/MobileEpisodesScene'
import { MobileEpisodeDetailScene } from '@/components/dashboard/mobile/MobileEpisodeDetailScene'
import { MobileAudienceScene } from '@/components/dashboard/mobile/MobileAudienceScene'
import { MobileCitiesScene } from '@/components/dashboard/mobile/MobileCitiesScene'
import { useDashboardPdfExport } from '@/components/dashboard/useDashboardPdfExport'
import { useYouTubeRefresh } from '@/components/dashboard/useYouTubeRefresh'
import { useEpisodesRefresh } from '@/components/dashboard/useEpisodesRefresh'
import { useEnabledPlatforms } from '@/components/dashboard/useEnabledPlatforms'

// Дашборду на мобильном нужно +25px «воздуха» к высоте сцены.
const MOBILE_SCENE_HEIGHT_OFFSET = 25

export default function DashboardPage() {
  const { podcastId } = useParams<{ podcastId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const uploadPlays = usePodcastStore(s => s.uploadPlays)
  const refreshEpisodes = usePodcastStore(s => s.refreshEpisodes)
  const podcast = usePodcastStore(s => s.getPodcast(podcastId))
  const comparablePodcastCount = usePodcastStore(s => s.podcasts.filter(item => item.uploadedPlatforms.length > 0).length)
  const isDemo = podcast ? DEMO_IDS.has(podcastId) : false
  const podcastTitle = podcast?.title ?? ''
  const podcastImageUrl = podcast ? (resolvePodcastCoverUrl(podcast) ?? '') : ''
  const episodes = useMemo(() => podcast?.normalized ?? [], [podcast?.normalized])
  const rawPlays = useMemo(() => podcast?.rawPlays ?? [], [podcast?.rawPlays])
  const uploadedPlatformsArray = useMemo(
    () => podcast?.uploadedPlatforms ?? [],
    [podcast?.uploadedPlatforms]
  )
  const uploadedPlatformKeys = useMemo(
    () => uploadedPlatformsArray.map(platform => platform.platform),
    [uploadedPlatformsArray]
  )
  const uploadedPlatforms = useMemo(
    () => new Set(uploadedPlatformKeys),
    [uploadedPlatformKeys]
  )

  // ---- Состояние страницы ----
  const [episodeSortKey, setEpisodeSortKey] = useState<EpisodeSortKey>('total')
  const [episodeSortDesc, setEpisodeSortDesc] = useState(true)
  const [episodeListMode, setEpisodeListMode] = useState<EpisodeListMode>('top')
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null)
  const { enabledPlatforms, togglePlatform } = useEnabledPlatforms(podcastId, uploadedPlatformKeys)
  const { printRootRef, pdfGenerating, pdfError, handlePrintPdf } = useDashboardPdfExport(podcastTitle)

  const youtubeUploaded = uploadedPlatformsArray.find(p => p.platform === 'youtube')
  const showYoutubeRefresh = !isDemo && Boolean(youtubeUploaded)
  const showEpisodesRefresh = !isDemo && Boolean(podcast?.rssUrl) && podcast?.rssUrl !== 'https://demo' && episodes.length > 0

  const { youtubeRefreshing, youtubeMessage } = useYouTubeRefresh({
    podcastId,
    searchParams,
    uploadPlays,
    active: showYoutubeRefresh,
  })
  const { episodesRefreshing, episodesMessage, handleRefreshEpisodes } = useEpisodesRefresh({
    podcastId,
    rssUrl: podcast?.rssUrl,
    refreshEpisodes,
  })

  // ---- Производные данные ----
  const uploadedPlatformLabels = PLATFORMS
    .filter(platform => uploadedPlatforms.has(platform.key))
    .map(platform => platform.label)
  const activePlatforms = PLATFORMS
    .filter(platform => uploadedPlatforms.has(platform.key) && enabledPlatforms.has(platform.key))
  const disabledPlatformLabels = PLATFORMS
    .filter(platform => uploadedPlatforms.has(platform.key) && !enabledPlatforms.has(platform.key))
    .map(platform => platform.label)
  const topEpisodes = [...episodes]
    .sort((a, b) => b.plays.total - a.plays.total)
    .slice(0, 10)
  const totals = getPlatformTotals(episodes, rawPlays)
  const total = getTotalPlays(episodes)
  const averagePerEpisode = episodes.length > 0 ? Math.round(total / episodes.length) : 0
  const filteredEpisodes = getFilteredEpisodes(episodes, enabledPlatforms)
  const filteredTotals = getPlatformTotals(episodes, rawPlays, enabledPlatforms)
  const filteredTotal = getTotalPlays(filteredEpisodes)
  const filteredAveragePerEpisode = episodes.length > 0 ? Math.round(filteredTotal / episodes.length) : 0
  const sortedFilteredEpisodes = sortEpisodes(filteredEpisodes, episodeSortKey, episodeSortDesc)
  const filterActive = uploadedPlatformKeys.some(platform => !enabledPlatforms.has(platform))
  const canCompare = comparablePodcastCount >= 2
  const statCardMeta = buildStatCardMeta(uploadedPlatformsArray, rawPlays, episodes)

  const sortedEpisodes = sortEpisodes(episodes, episodeSortKey, episodeSortDesc)
  const visibleEpisodes = episodeListMode === 'top' ? sortedEpisodes.slice(0, 10) : sortedEpisodes
  const audience = podcast?.yandexAudience ?? null
  const { genderData, ageData } = buildAudienceChartData(audience)
  const selectedEpisode = selectedEpisodeId
    ? episodes.find(episode => episode.id === selectedEpisodeId) ?? null
    : null

  const mobilePlatformCards = PLATFORMS
    .map(platform => ({
      ...platform,
      value: totals[platform.key],
      pct: total > 0 ? Math.round(totals[platform.key] / total * 100) : 0,
    }))
    .filter(platform => platform.value > 0)

  // ---- Мобильные сцены ----
  const mobileDashboardScenes = useMemo<MobileScene[]>(() => {
    const scenes: MobileScene[] = [
      { id: 'overview', label: 'Управление' },
      { id: 'summary', label: 'Сводка' },
      { id: 'charts', label: 'Графики' },
      // { id: 'ai', label: 'AI' }, // временно скрыт
      { id: 'episodes', label: 'Эпизоды' },
    ]

    if (podcast?.yandexAudience) {
      scenes.push(
        { id: 'audience', label: 'Аудитория' },
        { id: 'cities', label: 'Города' },
      )
    }

    return scenes
  }, [podcast?.yandexAudience])

  const mobile = useMobileScenes({
    totalScenes: mobileDashboardScenes.length,
    remeasureKey: `${uploadedPlatformKeys.length}|${isDemo}|${podcastTitle}|${episodes.length}`,
    sceneHeightOffset: MOBILE_SCENE_HEIGHT_OFFSET,
  })

  const goToSetup = () => router.push(`/${podcastId}/setup`)
  const goToCompare = () => router.push('/compare')
  const goHome = () => router.push('/')

  const renderMobileScene = (sceneId: string) => {
    switch (sceneId) {
      case 'overview':
        return (
          <MobileOverviewScene
            totalScenes={mobileDashboardScenes.length}
            total={total}
            averagePerEpisode={averagePerEpisode}
            episodesCount={episodes.length}
            uploadedPlatformLabels={uploadedPlatformLabels}
            pdfGenerating={pdfGenerating}
            pdfError={pdfError}
            canCompare={canCompare}
            onPrintPdf={handlePrintPdf}
            onCompare={goToCompare}
            onAddData={goToSetup}
          />
        )
      case 'summary':
        return (
          <MobileSummaryScene
            total={total}
            averagePerEpisode={averagePerEpisode}
            episodesCount={episodes.length}
            platformCards={mobilePlatformCards}
            topEpisodes={topEpisodes}
          />
        )
      case 'charts':
        return (
          <div className="flex flex-col gap-4">
            <TrendChart episodes={episodes} compact />
            <PlatformChart episodes={episodes} rawPlays={rawPlays} compact />
          </div>
        )
      case 'ai':
        return (
          <AIInsights
            episodes={episodes}
            podcastTitle={podcastTitle}
            initialInsights={DEMO_INSIGHTS_MAP[podcastId]}
            compact
          />
        )
      case 'episodes':
      case 'episode-detail':
        if (sceneId === 'episode-detail' && selectedEpisode) {
          return (
            <MobileEpisodeDetailScene
              episode={selectedEpisode}
              platforms={PLATFORMS.filter(platform => uploadedPlatforms.has(platform.key))}
              onBack={() => setSelectedEpisodeId(null)}
            />
          )
        }
        return (
          <MobileEpisodesScene
            episodesCount={episodes.length}
            visibleEpisodes={visibleEpisodes}
            sortKey={episodeSortKey}
            listMode={episodeListMode}
            onSortKeyChange={key => {
              setEpisodeSortKey(key)
              setEpisodeSortDesc(true)
            }}
            onListModeChange={setEpisodeListMode}
            onSelectEpisode={setSelectedEpisodeId}
          />
        )
      case 'audience':
        return audience ? <MobileAudienceScene genderData={genderData} ageData={ageData} /> : null
      case 'cities':
        return audience ? <MobileCitiesScene cities={audience.cities ?? []} onBackToStart={() => mobile.setSceneIndex(0)} /> : null
      default:
        return null
    }
  }

  if (!podcast) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-[#6e6e73]">Подкаст не найден</p>
        <button onClick={goHome} className="mt-4 text-[#b150e2] text-sm hover:underline">На главную</button>
      </main>
    )
  }

  const mobileDashboardRenderScenes = selectedEpisode
    ? mobileDashboardScenes.map(scene => (
        scene.id === 'episodes'
          ? { ...scene, id: 'episode-detail', label: 'Эпизод' }
          : scene
      ))
    : mobileDashboardScenes

  return (
    <div className="min-h-screen bg-[#f5f5f7] print:bg-white">
      <MobileDashboardShell
        scenes={mobileDashboardRenderScenes}
        activeSceneIndex={mobile.activeSceneIndex}
        viewportHeight={mobile.viewportHeight}
        sceneViewportHeight={mobile.sceneViewportHeight}
        chromeRef={mobile.chromeRef}
        sceneContentRefs={mobile.sceneContentRefs}
        onTouchStart={mobile.onTouchStart}
        onTouchEnd={mobile.onTouchEnd}
        podcastTitle={podcastTitle}
        podcastImageUrl={podcastImageUrl}
        isDemo={isDemo}
        episodesCount={episodes.length}
        episodeDetailOpen={Boolean(selectedEpisode)}
        onBack={goHome}
        onLoadCsv={goToSetup}
        renderScene={renderMobileScene}
      />

      <div className="hidden md:block print:!block">
        <DashboardHeader
          podcastTitle={podcastTitle}
          podcastImageUrl={podcastImageUrl}
          isDemo={isDemo}
          uploadedPlatforms={uploadedPlatforms}
          hasEpisodes={episodes.length > 0}
          onBack={goHome}
          onPrintPdf={handlePrintPdf}
          onCompare={goToCompare}
          onAddData={goToSetup}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 screen-only">
          {episodes.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-[#6e6e73] mb-4 text-[15px]">Данных пока нет</p>
              <button onClick={goToSetup} className="text-[#b150e2] hover:underline text-[14px]">
                Загрузить CSV
              </button>
            </div>
          ) : (
            <>
              {showEpisodesRefresh && (
                <RefreshPanel
                  dotColor="#b150e2"
                  title="Выпуски"
                  subtitle={`${episodes.length} в дашборде`}
                  message={episodesMessage}
                  refreshing={episodesRefreshing}
                  activeClassName="border-[#b150e2]/30 bg-white text-[#b150e2] hover:bg-[#b150e2]/5"
                  actionLabel="↻ Обновить выпуски"
                  onClick={handleRefreshEpisodes}
                />
              )}
              {showYoutubeRefresh && youtubeUploaded && (
                <RefreshPanel
                  dotColor="#ff453a"
                  title="YouTube"
                  subtitle={<>обновлено {formatTimeAgo(youtubeUploaded.uploadedAt)}</>}
                  message={youtubeMessage}
                  refreshing={youtubeRefreshing}
                  activeClassName="border-[#ff453a]/30 bg-white text-[#ff453a] hover:bg-[#ff453a]/5"
                  actionLabel="↻ Обновить"
                  href={`/api/youtube/auth?podcastId=${podcastId}&returnTo=dashboard`}
                />
              )}
              <PlatformFilters
                uploadedPlatforms={uploadedPlatformKeys}
                enabledPlatforms={enabledPlatforms}
                onToggle={togglePlatform}
              />
              <StatCards
                episodes={episodes}
                rawPlays={rawPlays}
                platformMeta={statCardMeta}
                enabledPlatforms={enabledPlatforms}
              />
              <TrendChart episodes={filteredEpisodes} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 print:grid-cols-3 print:gap-3">
                <div className="md:col-span-1 print:col-span-1">
                  <PlatformChart episodes={episodes} rawPlays={rawPlays} enabledPlatforms={enabledPlatforms} />
                </div>
                <div className="md:col-span-2 print:col-span-2">
                  <AIInsights
                    episodes={episodes}
                    podcastTitle={podcastTitle}
                    initialInsights={DEMO_INSIGHTS_MAP[podcastId]}
                    filterActive={filterActive}
                    disabledPlatformLabels={disabledPlatformLabels}
                  />
                </div>
              </div>
              <EpisodeTable
                key={activePlatforms.map(platform => platform.key).join(',')}
                episodes={filteredEpisodes}
                enabledPlatforms={enabledPlatforms}
                sortKey={episodeSortKey}
                desc={episodeSortDesc}
                onSortChange={(key, desc) => {
                  setEpisodeSortKey(key)
                  setEpisodeSortDesc(desc)
                }}
              />
              {audience && enabledPlatforms.has('yandex') && (
                <YandexAudienceSection audience={audience} />
              )}
            </>
          )}
        </main>
      </div>

      {episodes.length > 0 && (
        <DashboardPrintReport
          printRootRef={printRootRef}
          podcastTitle={podcastTitle}
          activePlatforms={activePlatforms}
          episodes={episodes}
          filteredEpisodes={filteredEpisodes}
          sortedFilteredEpisodes={sortedFilteredEpisodes}
          rawPlays={rawPlays}
          enabledPlatforms={enabledPlatforms}
          filteredTotals={filteredTotals}
          filteredTotal={filteredTotal}
          filteredAveragePerEpisode={filteredAveragePerEpisode}
          sortKey={episodeSortKey}
          sortDesc={episodeSortDesc}
          audience={audience}
        />
      )}
    </div>
  )
}
