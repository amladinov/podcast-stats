'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, useRef } from 'react'
import { SafePodcastImage } from '@/components/SafePodcastImage'
import { usePodcastStore } from '@/lib/store'
import { parseMave } from '@/lib/parsers/mave'
import { parseMavePaste } from '@/lib/parsers/mavePaste'
import { parseSpotify } from '@/lib/parsers/spotify'
import { parseYandex } from '@/lib/parsers/yandex'
import { parseVK } from '@/lib/parsers/vk'
import { parseYandexGender } from '@/lib/parsers/yandexGender'
import { parseYandexAge } from '@/lib/parsers/yandexAge'
import { parseYandexCities } from '@/lib/parsers/yandexCities'
import { getCtaClasses } from '@/lib/ctaStyles'
import { formatPeriod, getEpisodeRangeFromNormalized, getPeriodFromPlays } from '@/lib/platformPeriods'
import type { MavePasteEpisode, PlayRecord, YandexAudience } from '@/types'

type GuidePart = { t: 'text'; v: string } | { t: 'link'; label: string; url: string }
type GuideStep = GuidePart[]

const PLATFORMS = [
  {
    key: 'mave' as const,
    label: 'Mave',
    desc: 'CSV с ежедневной статистикой или вставка списка выпусков из ЛК Mave',
    dot: '#b150e2',
    guide: [
      [{ t: 'text' as const, v: 'В личном кабинете mave.digital перейди в раздел «Аналитика»' }],
      [{ t: 'text' as const, v: 'Выбери нужный период, например «Год»' }],
      [{ t: 'text' as const, v: 'Нажми иконку файла со стрелкой вниз (под фильтром периода)' }],
      [{ t: 'text' as const, v: 'Выбери формат CSV и нажми «Скачать файл»' }],
    ] as GuideStep[],
    note: '⚠ Для экспорта нужна платная подписка Mave+',
  },
  {
    key: 'yandex' as const,
    label: 'Яндекс Музыка',
    desc: 'CSV из DataLens (разделитель — точка с запятой)',
    dot: '#ff9f0a',
    guide: [
      [
        { t: 'text' as const, v: 'Открой ' },
        { t: 'link' as const, label: 'Личный кабинет Яндекс Музыки', url: 'https://datalens.ru/dzmgxub2lsve5-analitika-podkastov-na-yandeks-muzyke' },
        { t: 'text' as const, v: ' — если не подключён, настрой по ' },
        { t: 'link' as const, label: 'инструкции', url: 'https://yandex.cloud/ru/docs/tutorials/datalens/data-from-podcasts#configure-connection' },
      ],
      [{ t: 'text' as const, v: 'Выбери нужный подкаст в разделе «Подкасты»' }],
      [{ t: 'text' as const, v: 'Выбери период в разделе «Даты»' }],
      [{ t: 'text' as const, v: 'В разделе «Статистика прослушиваний эпизодов» нажми «…» в углу' }],
      [{ t: 'text' as const, v: 'Выбери «Сохранить как» → CSV, не меняй настройки → «Сохранить»' }],
    ] as GuideStep[],
  },
  {
    key: 'spotify' as const,
    label: 'Spotify',
    desc: 'CSV из Spotify for Podcasters',
    dot: '#30d158',
    guide: [
      [
        { t: 'text' as const, v: 'Открой ' },
        { t: 'link' as const, label: 'Spotify for Podcasters', url: 'https://creators.spotify.com/' },
        { t: 'text' as const, v: ' — зарегистрируйся, если ещё нет' },
      ],
      [{ t: 'text' as const, v: 'Добавь подкаст через RSS-ленту (если не добавлен)' }],
      [{ t: 'text' as const, v: 'В меню слева выбери свой подкаст → раздел «Episodes»' }],
      [{ t: 'text' as const, v: 'Справа над списком эпизодов выбери нужный период' }],
      [{ t: 'text' as const, v: 'Нажми кружок со стрелкой рядом с фильтром периода — скачается CSV' }],
    ] as GuideStep[],
  },
  {
    key: 'vk' as const,
    label: 'ВКонтакте',
    desc: 'CSV из статистики VK (разделитель — точка с запятой)',
    dot: '#0a84ff',
    guide: [
      [{ t: 'text' as const, v: 'Зайди в сообщество, к которому привязан подкаст' }],
      [{ t: 'text' as const, v: 'Перейди в «Статистика» → «Подкасты» → «Эпизоды»' }],
      [{ t: 'text' as const, v: 'В правом верхнем углу нажми кнопку скачивания' }],
      [{ t: 'text' as const, v: 'Формат файла: CSV, «Данные для экспорта»: Подкасты' }],
      [{ t: 'text' as const, v: 'Выбери нужный период и нажми «Экспортировать»' }],
    ] as GuideStep[],
  },
]

const YOUTUBE_PLATFORM = {
  key: 'youtube' as const,
  label: 'YouTube',
  desc: 'Подключи канал через Google-аккаунт',
  dot: '#ff0000',
}

const MOBILE_SETUP_PLATFORM_ORDER = ['mave', 'yandex', 'spotify', 'vk', 'youtube'] as const

const MOBILE_SETUP_SCENES = [
  { id: 'mave', label: 'Mave' },
  { id: 'yandex', label: 'Яндекс' },
  { id: 'spotify', label: 'Spotify' },
  { id: 'vk', label: 'VK' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'done', label: 'Готово' },
] as const

function parsePlatform(platform: string, text: string): PlayRecord[] {
  if (platform === 'mave') return parseMave(text)
  if (platform === 'yandex') return parseYandex(text)
  if (platform === 'spotify') return parseSpotify(text)
  if (platform === 'vk') return parseVK(text)
  return []
}

function getTodayISODate(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function SetupPage() {
  const { podcastId } = useParams<{ podcastId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const podcast = usePodcastStore(s => s.getPodcast(podcastId))
  const uploadPlays = usePodcastStore(s => s.uploadPlays)
  const uploadYandexAudience = usePodcastStore(s => s.uploadYandexAudience)

  const [uploading, setUploading] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [previews, setPreviews] = useState<Record<string, number>>({})
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [lastUploadedKey, setLastUploadedKey] = useState<string | null>(null)
  const [youtubeLoading, setYoutubeLoading] = useState(false)
  const [openGuide, setOpenGuide] = useState<string | null>(null)
  const [audienceUploading, setAudienceUploading] = useState<string | null>(null)
  const [audienceErrors, setAudienceErrors] = useState<Record<string, string>>({})
  const [audienceDone, setAudienceDone] = useState<Record<string, boolean>>({})
  const [mavePasteText, setMavePasteText] = useState('')
  const [mavePastePreview, setMavePastePreview] = useState<MavePasteEpisode[]>([])
  const [mavePasteWarnings, setMavePasteWarnings] = useState<string[]>([])
  const [mavePasteError, setMavePasteError] = useState('')
  const [maveTutorialOpen, setMaveTutorialOpen] = useState(false)
  const [isMaveAlternativeOpen, setIsMaveAlternativeOpen] = useState(false)
  const [setupSceneIndex, setSetupSceneIndex] = useState(0)
  const [mobileViewportHeight, setMobileViewportHeight] = useState(0)
  const [mobileChromeHeight, setMobileChromeHeight] = useState(0)
  const ytImportDone = useRef(false)
  const mobileChromeRef = useRef<HTMLDivElement | null>(null)
  const mobileSceneContentRefs = useRef<Array<HTMLDivElement | null>>([])
  const mobileTouchStartRef = useRef<{ x: number; y: number } | null>(null)

  // Handle YouTube OAuth callback
  useEffect(() => {
    const ytStatus = searchParams.get('youtube')
    if (!ytStatus || ytImportDone.current) return
    ytImportDone.current = true

    // Clean URL params
    window.history.replaceState({}, '', `/${podcastId}/setup`)

    if (ytStatus === 'error') {
      const reason = searchParams.get('reason') || 'unknown'
      setErrors(prev => ({ ...prev, youtube: `Ошибка подключения YouTube: ${reason}` }))
      return
    }

    if (ytStatus === 'success') {
      setYoutubeLoading(true)
      setErrors(prev => ({ ...prev, youtube: '' }))

      fetch('/api/youtube/videos', { method: 'POST' })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json()
        })
        .then(data => {
          if (data.error) throw new Error(data.error)
          const videos = data.videos as Array<{
            title: string; videoId: string; publishDate: string
            views: number; likes: number; comments: number
          }>

          const plays: PlayRecord[] = videos.map(v => ({
            episodeTitle: v.title,
            platform: 'youtube' as const,
            date: v.publishDate,
            plays: v.views,
            likes: v.likes,
            comments: v.comments,
          }))

          if (plays.length === 0) throw new Error('Не найдено видео на канале')

          uploadPlays(podcastId, plays, {
            platform: 'youtube',
            fileName: 'YouTube API',
            recordsCount: plays.length,
            uploadedAt: new Date().toISOString(),
            ...getPeriodFromPlays(plays),
          })
          setPreviews(prev => ({ ...prev, youtube: plays.length }))
          setLastUploadedKey('youtube')
        })
        .catch(e => {
          setErrors(prev => ({ ...prev, youtube: e instanceof Error ? e.message : 'Ошибка импорта YouTube' }))
        })
        .finally(() => setYoutubeLoading(false))
      }
  }, [searchParams, podcastId, uploadPlays])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    const prevBodyOverscroll = body.style.overscrollBehaviorY

    const syncMobileViewportLock = () => {
      if (window.matchMedia('(max-width: 767px)').matches) {
        html.style.overflow = 'hidden'
        body.style.overflow = 'hidden'
        body.style.overscrollBehaviorY = 'none'
      } else {
        html.style.overflow = prevHtmlOverflow
        body.style.overflow = prevBodyOverflow
        body.style.overscrollBehaviorY = prevBodyOverscroll
      }
    }

    syncMobileViewportLock()
    window.addEventListener('resize', syncMobileViewportLock)

    return () => {
      window.removeEventListener('resize', syncMobileViewportLock)
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
      body.style.overscrollBehaviorY = prevBodyOverscroll
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const syncMobileHeights = () => {
      setMobileViewportHeight(window.innerHeight)
      setMobileChromeHeight(mobileChromeRef.current?.offsetHeight ?? 0)
    }

    syncMobileHeights()
    window.addEventListener('resize', syncMobileHeights)
    window.addEventListener('orientationchange', syncMobileHeights)

    return () => {
      window.removeEventListener('resize', syncMobileHeights)
      window.removeEventListener('orientationchange', syncMobileHeights)
    }
  }, [maveTutorialOpen, openGuide, previews, errors, audienceDone, audienceErrors, uploading, audienceUploading, youtubeLoading])

  useEffect(() => {
    if (
      mavePasteText.trim() ||
      mavePastePreview.length > 0 ||
      mavePasteWarnings.length > 0 ||
      mavePasteError
    ) {
      setIsMaveAlternativeOpen(true)
    }
  }, [mavePasteError, mavePastePreview.length, mavePasteText, mavePasteWarnings.length])

  const handleFile = useCallback(async (platform: typeof PLATFORMS[number]['key'], file: File) => {
    setUploading(platform)
    setLastUploadedKey(null)
    setErrors(prev => ({ ...prev, [platform]: '' }))
    try {
      const text = await file.text()
      const plays = parsePlatform(platform, text)
      if (plays.length === 0) throw new Error('Не удалось распознать данные в файле')
      uploadPlays(podcastId, plays, {
        platform,
        fileName: file.name,
        recordsCount: plays.length,
        uploadedAt: new Date().toISOString(),
        sourceKind: platform === 'mave' ? 'csv' : undefined,
        timelineSourceKind: platform === 'mave' ? 'csv' : undefined,
        ...getPeriodFromPlays(plays),
      })
      setPreviews(prev => ({ ...prev, [platform]: plays.length }))
      setLastUploadedKey(platform)
    } catch (e) {
      setErrors(prev => ({ ...prev, [platform]: e instanceof Error ? e.message : 'Ошибка' }))
    } finally {
      setUploading(null)
    }
  }, [podcastId, uploadPlays])

  const handleMavePastePreview = useCallback(() => {
    setMavePasteError('')

    const result = parseMavePaste(mavePasteText)
    if (result.episodes.length === 0) {
      setMavePastePreview([])
      setMavePasteWarnings([])
      setMavePasteError('Не удалось распознать ни одного выпуска. Вставь текст со страницы выпусков Mave.')
      return
    }

    setMavePastePreview(result.episodes)
    setMavePasteWarnings(result.warnings.map(item => item.reason))
  }, [mavePasteText])

  const handleMavePasteImport = useCallback(() => {
    if (mavePastePreview.length === 0) return

    const playRecords: PlayRecord[] = mavePastePreview.map(episode => ({
      episodeTitle: episode.title,
      platform: 'mave',
      date: episode.publishDate,
      plays: episode.plays,
      sourceKind: 'paste',
      videoViews: episode.videoViews,
    }))

    const existingMave = podcast?.uploadedPlatforms.find(platform => platform.platform === 'mave')
    const hasCsvTimeline = existingMave?.sourceKind === 'csv' || existingMave?.timelineSourceKind === 'csv'
    const dates = mavePastePreview.map(episode => episode.publishDate).sort((a, b) => a.localeCompare(b))

    uploadPlays(podcastId, playRecords, {
      platform: 'mave',
      fileName: 'Mave Paste Snapshot',
      recordsCount: playRecords.length,
      uploadedAt: new Date().toISOString(),
      sourceKind: 'paste',
      timelineSourceKind: hasCsvTimeline ? 'csv' : undefined,
      periodStart: dates[0],
      periodEnd: getTodayISODate(),
    })

    setPreviews(prev => ({ ...prev, mave: playRecords.length }))
    setLastUploadedKey('mave')
    setMavePasteWarnings([])
  }, [mavePastePreview, podcast?.uploadedPlatforms, podcastId, uploadPlays])

  const handleAudienceFile = useCallback(async (type: 'gender' | 'age' | 'cities', file: File) => {
    setAudienceUploading(type)
    setAudienceErrors(prev => ({ ...prev, [type]: '' }))
    try {
      const text = await file.text()
      let data: YandexAudience
      if (type === 'gender') {
        const result = parseYandexGender(text)
        if (result.female === 0 && result.male === 0 && result.unknown === 0) throw new Error('Не удалось распознать данные')
        data = { gender: result }
      } else if (type === 'age') {
        const result = parseYandexAge(text)
        if (result.length === 0) throw new Error('Не удалось распознать данные')
        data = { age: result }
      } else {
        const result = parseYandexCities(text)
        if (result.length === 0) throw new Error('Не удалось распознать данные')
        data = { cities: result }
      }
      uploadYandexAudience(podcastId, data)
      setAudienceDone(prev => ({ ...prev, [type]: true }))
    } catch (e) {
      setAudienceErrors(prev => ({ ...prev, [type]: e instanceof Error ? e.message : 'Ошибка' }))
    } finally {
      setAudienceUploading(null)
    }
  }, [podcastId, uploadYandexAudience])

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
  const setupTotalScenes = MOBILE_SETUP_SCENES.length
  const mobileSceneViewportHeight = mobileViewportHeight > 0
    ? Math.max(mobileViewportHeight - mobileChromeHeight, 0)
    : 0

  const mobilePlatformStatuses = MOBILE_SETUP_PLATFORM_ORDER.map(key => {
    const base =
      key === 'youtube'
        ? YOUTUBE_PLATFORM
        : PLATFORMS.find(platform => platform.key === key)!

    return {
      key,
      label: key === 'yandex' ? 'Яндекс' : base.label,
      isDone: uploadedKeys.has(key),
      isCurrent: MOBILE_SETUP_SCENES[setupSceneIndex]?.id === key,
    }
  })

  const mobileSetupStepMap = [
    ...mobilePlatformStatuses,
    {
      key: 'done' as const,
      label: 'Итог',
      isDone: uploadedKeys.size > 0,
      isCurrent: MOBILE_SETUP_SCENES[setupSceneIndex]?.id === 'done',
    },
  ]

  function handleMobileTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0]
    mobileTouchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  function handleMobileTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const start = mobileTouchStartRef.current
    mobileTouchStartRef.current = null
    if (!start) return

    const touch = event.changedTouches[0]
    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y

    if (Math.abs(deltaY) < 56 || Math.abs(deltaY) < Math.abs(deltaX) * 1.2) return

    const currentContent = mobileSceneContentRefs.current[setupSceneIndex]
    const scrollTop = currentContent?.scrollTop ?? 0
    const clientHeight = currentContent?.clientHeight ?? 0
    const scrollHeight = currentContent?.scrollHeight ?? 0
    const atTop = scrollTop <= 4
    const atBottom = scrollTop + clientHeight >= scrollHeight - 4

    if (deltaY < 0) {
      if (setupSceneIndex < setupTotalScenes - 1 && (scrollHeight <= clientHeight + 4 || atBottom)) {
        setSetupSceneIndex(current => Math.min(current + 1, setupTotalScenes - 1))
      }
      return
    }

    if (setupSceneIndex > 0 && atTop) {
      setSetupSceneIndex(current => Math.max(current - 1, 0))
    }
  }

  const renderGuide = (platformKey: typeof PLATFORMS[number]['key'], isGuideOpen: boolean, guide: GuideStep[], note?: string) => (
    <div
      className="overflow-hidden transition-all duration-500 ease-in-out border-t border-transparent mt-2"
      style={{ maxHeight: isGuideOpen ? '420px' : '0px' }}
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

  const renderAudienceCards = () => {
    const cards = [
      {
        type: 'gender' as const,
        label: 'Аудитория: Пол',
        desc: 'C14. Пол слушателей — из DataLens',
        isDone: audienceDone['gender'] || !!podcast.yandexAudience?.gender,
        isUploading: audienceUploading === 'gender',
        err: audienceErrors['gender'],
      },
      {
        type: 'age' as const,
        label: 'Аудитория: Возраст',
        desc: 'C15. Возраст слушателей — из DataLens',
        isDone: audienceDone['age'] || !!podcast.yandexAudience?.age,
        isUploading: audienceUploading === 'age',
        err: audienceErrors['age'],
      },
      {
        type: 'cities' as const,
        label: 'Аудитория: Города',
        desc: 'C19. Статистика по городам — из DataLens',
        isDone: audienceDone['cities'] || !!podcast.yandexAudience?.cities,
        isUploading: audienceUploading === 'cities',
        err: audienceErrors['cities'],
      },
    ]

    return (
      <div className="space-y-2">
        {cards.map(card => (
          <div
            key={card.type}
            className="bg-white rounded-xl p-3 border border-[#e5e5ea] shadow-sm"
          >
            <div className="flex flex-col gap-3">
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
              <label className="w-full min-w-0 cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleAudienceFile(card.type, file)
                    e.target.value = ''
                  }}
                  disabled={audienceUploading !== null}
                />
                <span className={`${getCtaClasses({ tone: 'secondary', size: 'compact', fullWidth: true })} min-w-0 text-[12px] ${
                  audienceUploading !== null ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#e5e5ea]'
                }`}>
                  {card.isUploading ? (
                    <>
                      <svg className="animate-spin-smooth w-3 h-3 flex-shrink-0" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
                        <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
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

  const renderPlatformScene = (p: typeof PLATFORMS[number]) => {
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
    const preview = previews[p.key]
    const err = errors[p.key]
    const isUploading = uploading === p.key
    const isDone = uploadedKeys.has(p.key) || !!preview
    const isBlocked = anyUploading && !isUploading
    const showHint = lastUploadedKey === p.key && uploadedKeys.size < PLATFORMS.length && !anyUploading
    const isGuideOpen = openGuide === p.key
    const isMavePaste = p.key === 'mave' && uploaded?.sourceKind === 'paste'
    const hasMaveCsvTimeline = p.key === 'mave' && (uploaded?.sourceKind === 'csv' || uploaded?.timelineSourceKind === 'csv')

    return (
      <div className="space-y-3">
        <div
          className={`bg-white rounded-2xl p-5 border shadow-sm transition-all duration-200 ${
            isUploading
              ? 'border-[#b150e2] animate-pulse'
              : dragOver === p.key
                ? 'border-dashed border-[#b150e2] bg-[#b150e2]/5 scale-[1.01]'
                : 'border-[#e5e5ea]'
          }`}
          onDragOver={e => { if (!anyUploading) { e.preventDefault(); setDragOver(p.key) } }}
          onDragLeave={() => setDragOver(null)}
          onDrop={e => {
            e.preventDefault()
            setDragOver(null)
            if (!anyUploading) {
              const file = e.dataTransfer.files?.[0]
              if (file) handleFile(p.key, file)
            }
          }}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.dot }} />
              <div className="min-w-0 flex-1">
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
                  onClick={() => setOpenGuide(prev => prev === p.key ? null : p.key)}
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

            <div className="flex w-full min-w-0 items-center gap-2">
              {isDone && !isUploading && (
                <span className="animate-pop text-green-500 text-[18px] leading-none">✓</span>
              )}
              <label className={`min-w-0 flex-1 ${isBlocked ? 'pointer-events-none' : 'cursor-pointer'}`}>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleFile(p.key, file)
                    e.target.value = ''
                  }}
                  disabled={anyUploading}
                />
                <span className={`${getCtaClasses({ tone: 'secondary', size: 'compact', fullWidth: true })} min-w-0 ${
                  isBlocked
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-[#e5e5ea]'
                }`}>
                  {isUploading ? (
                    <>
                      <svg className="animate-spin-smooth w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
                        <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Обрабатываю...
                    </>
                  ) : isDone ? 'Заменить' : 'Выбрать CSV'}
                </span>
              </label>
            </div>

            {renderGuide(p.key, isGuideOpen, p.guide, 'note' in p ? p.note : undefined)}

            {p.key === 'mave' && (
              <div className="rounded-xl border border-[#e5e5ea] bg-[#faf8ff] p-4">
                <button
                  type="button"
                  onClick={() => setIsMaveAlternativeOpen(prev => !prev)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/80 bg-white/80 px-4 py-3 text-left transition-colors hover:bg-white"
                  aria-expanded={isMaveAlternativeOpen}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-[13px] font-semibold text-[#1d1d1f]">Альтернатива без подписки: вставка текста</h4>
                      <span className="whitespace-nowrap rounded-full border border-[#e5e5ea] bg-white px-2 py-1 text-[10px] text-[#7b57c8]">
                        Альтернатива
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-[#6e6e73]">
                      Вторичный сценарий. Нажми, чтобы раскрыть ручную вставку из Mave.
                    </p>
                  </div>
                  <span
                    className="inline-block flex-shrink-0 text-[#7b57c8] transition-transform duration-300"
                    style={{ transform: isMaveAlternativeOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    ↓
                  </span>
                </button>

                <div
                  className="overflow-hidden transition-all duration-500 ease-in-out"
                  style={{ maxHeight: isMaveAlternativeOpen ? '2200px' : '0px', opacity: isMaveAlternativeOpen ? 1 : 0 }}
                >
                  <div className="mt-3">
                    <p className="text-[12px] leading-relaxed text-[#6e6e73]">
                      Скопируй список выпусков со страницы Mave. Этот способ обновит актуальные накопленные значения на дату импорта, а если CSV уже был загружен, сохранит его историческую динамику.
                    </p>

                    <button
                      onClick={() => setMaveTutorialOpen(prev => !prev)}
                      className="mt-3 flex w-full items-center justify-between rounded-xl border border-white/80 bg-white/80 px-4 py-3 text-left transition-colors hover:bg-white"
                    >
                      <div>
                        <p className="text-[13px] font-medium text-[#1d1d1f]">Как быстро скопировать данные из Mave</p>
                        <p className="mt-0.5 text-[12px] text-[#6e6e73]">Короткое видео и 3 шага прямо в карточке импорта</p>
                      </div>
                      <span
                        className="inline-block text-[#7b57c8] transition-transform duration-300"
                        style={{ transform: maveTutorialOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      >
                        ↓
                      </span>
                    </button>

                    <div
                      className="overflow-hidden transition-all duration-500 ease-in-out"
                      style={{ maxHeight: maveTutorialOpen ? '720px' : '0px', opacity: maveTutorialOpen ? 1 : 0 }}
                    >
                      <div className="mt-4 rounded-[24px] border border-[#e7e2f3] bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(246,241,255,0.86))] p-3 shadow-[0_20px_50px_rgba(177,80,226,0.10)]">
                        <div className="grid gap-4">
                          <div className="relative overflow-hidden rounded-2xl border border-[#ebe7f5] bg-[linear-gradient(135deg,#f6f1ff,#eef5ff)] p-4 shadow-sm">
                            <div className="pointer-events-none absolute inset-0">
                              <div className="absolute -top-8 left-6 h-24 w-24 rounded-full bg-[#b150e2]/15 blur-2xl" />
                              <div className="absolute bottom-0 right-6 h-24 w-24 rounded-full bg-[#0a84ff]/12 blur-2xl" />
                            </div>
                            <div className="relative">
                              <div className="mb-3 flex items-center justify-between gap-2">
                                <span className="rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#7b57c8]">
                                  Видео-туториал
                                </span>
                                <span className="text-[11px] text-[#6e6e73]">ручное выделение + copy</span>
                              </div>
                              <div className="overflow-hidden rounded-[20px] border border-white/70 bg-white/70 shadow-[0_10px_30px_rgba(29,29,31,0.08)]">
                                <video
                                  className="block aspect-[16/9] w-full bg-white object-cover"
                                  src="/mave-paste-tutorial.fixed.mp4"
                                  autoPlay
                                  muted
                                  loop
                                  playsInline
                                  controls
                                />
                              </div>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-[#ebe7f5] bg-white p-5 shadow-sm">
                            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8e8e93]">Сценарий</p>
                            <div className="mt-3 space-y-3">
                              {[
                                'Открой раздел «Выпуски» в Mave и прокрути до видимых карточек эпизодов.',
                                'Мышкой выдели только список выпусков и скопируй его через Cmd/Ctrl + C.',
                                'Вернись в Podcast Stats, вставь текст в поле и нажми «Распознать вставку».',
                              ].map((step, index) => (
                                <div key={step} className="flex items-start gap-3">
                                  <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#b150e2] text-[11px] font-semibold text-white">
                                    {index + 1}
                                  </span>
                                  <p className="text-[14px] leading-relaxed text-[#3d3d3f]">{step}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <textarea
                      value={mavePasteText}
                      onChange={event => {
                        setMavePasteText(event.target.value)
                        setMavePastePreview([])
                        setMavePasteWarnings([])
                        if (mavePasteError) setMavePasteError('')
                      }}
                      placeholder="Вставь сюда скопированный текст со страницы выпусков Mave"
                      className="mt-3 min-h-[160px] w-full rounded-xl border border-[#e5e5ea] bg-white px-4 py-3 text-[13px] text-[#1d1d1f] placeholder-[#aeaeb2] focus:border-[#b150e2] focus:outline-none focus:ring-2 focus:ring-[#b150e2]/15"
                    />

                    <div className="mt-3 flex flex-col gap-2">
                      <button
                        onClick={handleMavePastePreview}
                        disabled={!mavePasteText.trim() || anyUploading}
                        className={getCtaClasses({
                          tone: 'secondary',
                          size: 'compact',
                          fullWidth: true,
                          disabled: !mavePasteText.trim() || anyUploading,
                        })}
                      >
                        Распознать вставку
                      </button>
                      <button
                        onClick={handleMavePasteImport}
                        disabled={mavePastePreview.length === 0 || mavePasteWarnings.length > 0 || anyUploading}
                        className={getCtaClasses({
                          tone: 'primary',
                          size: 'compact',
                          fullWidth: true,
                          disabled: mavePastePreview.length === 0 || mavePasteWarnings.length > 0 || anyUploading,
                        })}
                      >
                        Импортировать в Mave
                      </button>
                      {mavePastePreview.length > 0 && (
                        <span className="text-[12px] text-[#6e6e73]">
                          Распознано {mavePastePreview.length.toLocaleString('ru')} выпусков
                        </span>
                      )}
                    </div>

                    {mavePasteError && (
                      <p className="mt-3 text-[12px] text-red-500">{mavePasteError}</p>
                    )}

                    {mavePasteWarnings.length > 0 && (
                      <p className="mt-3 text-[12px] text-[#8e8e93]">
                        Нераспознанные блоки: {mavePasteWarnings.length}. Импорт отключён, пока текст не будет распознан полностью.
                      </p>
                    )}

                    {mavePastePreview.length > 0 && (
                      <div className="mt-3 overflow-hidden rounded-xl border border-[#ebe7f5] bg-white">
                        <div className="border-b border-[#f3f0fa] px-4 py-2 text-[12px] font-medium text-[#6e6e73]">
                          Preview перед импортом
                        </div>
                        <div className="max-h-[260px] overflow-y-auto">
                          <table className="w-full text-[12px]">
                            <thead className="sticky top-0 bg-white">
                              <tr className="text-left text-[#8e8e93]">
                                <th className="px-4 py-2 font-medium">Дата</th>
                                <th className="px-4 py-2 font-medium">Выпуск</th>
                                <th className="px-4 py-2 font-medium">Просл.</th>
                                <th className="px-4 py-2 font-medium">Видео</th>
                              </tr>
                            </thead>
                            <tbody>
                              {mavePastePreview.slice(0, 12).map(episode => (
                                <tr key={`${episode.publishDate}-${episode.title}`} className="border-t border-[#f5f5f7] align-top">
                                  <td className="px-4 py-2 whitespace-nowrap text-[#6e6e73]">{episode.publishDate}</td>
                                  <td className="px-4 py-2 text-[#1d1d1f]">
                                    <div>{episode.title}</div>
                                    <div className="mt-0.5 text-[11px] text-[#8e8e93]">
                                      {[episode.seasonLabel, episode.episodeNumber ? `${episode.episodeNumber} выпуск` : null, episode.durationLabel].filter(Boolean).join(' · ')}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-[#1d1d1f]">{episode.plays.toLocaleString('ru')}</td>
                                  <td className="px-4 py-2 whitespace-nowrap text-[#6e6e73]">{episode.videoViews.toLocaleString('ru')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {mavePastePreview.length > 12 && (
                          <p className="border-t border-[#f3f0fa] px-4 py-2 text-[11px] text-[#8e8e93]">
                            И ещё {mavePastePreview.length - 12} выпусков будут импортированы.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {showHint && (
              <p className="text-[#aeaeb2] text-[12px]">→ Загрузи следующий источник</p>
            )}
          </div>
        </div>

        {p.key === 'yandex' && renderAudienceCards()}
      </div>
    )
  }

  const renderYouTubeScene = () => {
    const ytUploaded = podcast.uploadedPlatforms.find(u => u.platform === 'youtube')
    const ytFallbackPeriod = getPeriodFromPlays(podcast.rawPlays.filter(play => play.platform === 'youtube'))
    const ytPeriod = formatPeriod(
      ytUploaded?.periodStart ?? ytFallbackPeriod.periodStart,
      ytUploaded?.periodEnd ?? ytFallbackPeriod.periodEnd
    )
    const ytPreview = previews['youtube']
    const ytErr = errors['youtube']
    const ytDone = uploadedKeys.has('youtube') || !!ytPreview
    const ytBlocked = anyUploading || youtubeLoading

    return (
      <div className="bg-white rounded-2xl p-5 border border-[#e5e5ea] shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: YOUTUBE_PLATFORM.dot }} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-[#1d1d1f] text-[15px]">{YOUTUBE_PLATFORM.label}</h3>
                {ytDone && (
                  <span className="text-[11px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium border border-green-100">
                    ✓ Готово
                  </span>
                )}
              </div>
              <p className="text-[#aeaeb2] text-[12px] mt-0.5">{YOUTUBE_PLATFORM.desc}</p>
              {ytUploaded && !ytPreview && (
                <p className="text-[#aeaeb2] text-[11px] mt-1">{ytUploaded.recordsCount.toLocaleString('ru')} видео</p>
              )}
              {ytPreview && (
                <p className="text-green-600 text-[11px] mt-1">{ytPreview.toLocaleString('ru')} видео</p>
              )}
              {ytPeriod && (
                <p className="text-[#6e6e73] text-[11px] mt-1">Период: {ytPeriod}</p>
              )}
              {ytErr && <p className="text-red-500 text-[12px] mt-1">{ytErr}</p>}
            </div>
          </div>

          <div className="flex w-full min-w-0 items-center gap-2">
            {ytDone && !youtubeLoading && (
              <span className="animate-pop text-green-500 text-[18px] leading-none">✓</span>
            )}
            <a
              href={ytBlocked ? undefined : `/api/youtube/auth?podcastId=${podcastId}`}
              className={`${getCtaClasses({ tone: 'secondary', size: 'compact', fullWidth: true })} min-w-0 flex-1 ${
                ytBlocked
                  ? 'opacity-50 cursor-not-allowed pointer-events-none'
                  : 'hover:bg-[#e5e5ea]'
              }`}
            >
              {youtubeLoading ? (
                <>
                  <svg className="animate-spin-smooth w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
                    <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Подключаю...
                </>
              ) : ytDone ? 'Переподключить' : 'Подключить YouTube'}
            </a>
          </div>
        </div>
      </div>
    )
  }

  const renderFinishScene = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-5 border border-[#e5e5ea] shadow-sm">
        <h3 className="text-[16px] font-semibold text-[#1d1d1f]">Готово к просмотру</h3>
        <p className="mt-1 text-[13px] text-[#6e6e73]">
          Проверь, какие платформы уже подключены, и переходи в дашборд. Остальные источники можно добавить позже.
        </p>
      </div>

      <div className="space-y-2">
        {mobilePlatformStatuses.map(status => (
          <div key={status.key} className="flex items-center justify-between rounded-xl border border-[#e5e5ea] bg-white px-4 py-3 shadow-sm">
            <span className="text-[14px] font-medium text-[#1d1d1f]">{status.label}</span>
            <span className={`text-[12px] font-medium ${status.isDone ? 'text-green-600' : 'text-[#8e8e93]'}`}>
              {status.isDone ? 'Готово' : 'Не добавлено'}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[12px] text-[#aeaeb2] text-center">
        💡 Для точной статистики выгружай данные за одинаковый период со всех платформ
      </p>

      <button
        onClick={() => router.push(`/${podcastId}/dashboard`)}
        disabled={uploadedKeys.size === 0}
        className={getCtaClasses({
          tone: 'primary',
          fullWidth: true,
          disabled: uploadedKeys.size === 0,
        })}
      >
        Открыть дашборд
      </button>
    </div>
  )

  return (
    <>
    <div
      className="md:hidden mobile-viewport-shell bg-[#f5f5f7]"
      onTouchStart={handleMobileTouchStart}
      onTouchEnd={handleMobileTouchEnd}
      style={{ touchAction: 'manipulation', height: mobileViewportHeight || undefined }}
    >
      <div
        ref={mobileChromeRef}
        className="shrink-0 border-b border-[#e8e8ed] bg-white/92 backdrop-blur-md"
      >
        <div
          className="px-4 pb-3"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 18px)' }}
        >
          <button onClick={() => router.push('/')} className="text-[#b150e2] text-[14px] font-medium hover:opacity-70 transition-opacity">
            ← Назад
          </button>
          <div className="mt-2.5 flex items-center gap-3">
            {podcast.imageUrl && (
              <SafePodcastImage src={podcast.imageUrl} alt={podcast.title} width={36} height={36} className="rounded-xl object-cover shadow-sm" />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-[16px] font-semibold text-[#1d1d1f] truncate">{podcast.title}</h1>
              <p className="text-[#6e6e73] text-[12px]">{podcast.episodes.length} эпизодов</p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            {mobileSetupStepMap.map(status => (
              <span
                key={status.key}
                className={[
                  'inline-flex items-center justify-center rounded-full px-2 py-1 text-[10px] font-medium border transition-colors flex-1',
                  status.isCurrent
                    ? status.isDone
                      ? 'border-[#b150e2] bg-green-50 text-green-700 shadow-[inset_0_0_0_1px_rgba(177,80,226,0.35)]'
                      : 'border-[#b150e2] bg-[#faf6ff] text-[#7b57c8]'
                    : status.isDone
                      ? 'border-green-100 bg-green-50 text-green-700'
                      : 'border-[#e5e5ea] bg-[#f5f5f7] text-[#8e8e93]',
                ].join(' ')}
              >
                {status.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden" style={{ height: mobileSceneViewportHeight || undefined }}>
        <div
          className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            height: mobileSceneViewportHeight > 0 ? mobileSceneViewportHeight * setupTotalScenes : undefined,
            transform: mobileSceneViewportHeight > 0
              ? `translateY(-${setupSceneIndex * mobileSceneViewportHeight}px)`
              : `translateY(-${setupSceneIndex * 100}%)`,
          }}
        >
          {MOBILE_SETUP_SCENES.map((scene, index) => (
            <section
              key={scene.id}
              className="shrink-0 px-4 py-4"
              style={{ height: mobileSceneViewportHeight || undefined }}
            >
              <div
                ref={element => { mobileSceneContentRefs.current[index] = element }}
                className="h-full overflow-y-auto overscroll-contain pb-[max(env(safe-area-inset-bottom),14px)]"
              >
                {scene.id === 'youtube'
                  ? renderYouTubeScene()
                  : scene.id === 'done'
                    ? renderFinishScene()
                    : renderPlatformScene(PLATFORMS.find(platform => platform.key === scene.id)!)}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>

    <div className="hidden md:block min-h-screen bg-[#f5f5f7]">
      <div className="bg-white border-b border-[#e5e5ea] transition-all duration-500">
        <div className={`mx-auto px-4 sm:px-6 py-4 flex items-center gap-4 transition-all duration-500 ${maveTutorialOpen ? 'max-w-4xl' : 'max-w-2xl'}`}>
          <button onClick={() => router.push('/')} className="text-[#b150e2] text-[14px] font-medium hover:opacity-70 transition-opacity">
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

      <main className={`mx-auto px-4 sm:px-6 py-8 transition-all duration-500 ${maveTutorialOpen ? 'max-w-4xl' : 'max-w-2xl'}`}>
        <p className="text-[#6e6e73] text-[14px] mb-6">
          Загрузи статистику с платформ. CSV-файлы или подключение через аккаунт.
        </p>

        <div className="space-y-3">
          {PLATFORMS.map(p => {
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
            const preview = previews[p.key]
            const err = errors[p.key]
            const isUploading = uploading === p.key
            const isDone = uploadedKeys.has(p.key) || !!preview
            const isBlocked = anyUploading && !isUploading
            const showHint = lastUploadedKey === p.key && uploadedKeys.size < PLATFORMS.length && !anyUploading
            const isGuideOpen = openGuide === p.key
            const isMavePaste = p.key === 'mave' && uploaded?.sourceKind === 'paste'
            const hasMaveCsvTimeline = p.key === 'mave' && (uploaded?.sourceKind === 'csv' || uploaded?.timelineSourceKind === 'csv')

            const AUDIENCE_CARDS = p.key === 'yandex' ? [
              {
                type: 'gender' as const,
                label: 'Аудитория: Пол',
                desc: 'C14. Пол слушателей — из DataLens',
                isDone: audienceDone['gender'] || !!podcast.yandexAudience?.gender,
                isUploading: audienceUploading === 'gender',
                err: audienceErrors['gender'],
              },
              {
                type: 'age' as const,
                label: 'Аудитория: Возраст',
                desc: 'C15. Возраст слушателей — из DataLens',
                isDone: audienceDone['age'] || !!podcast.yandexAudience?.age,
                isUploading: audienceUploading === 'age',
                err: audienceErrors['age'],
              },
              {
                type: 'cities' as const,
                label: 'Аудитория: Города',
                desc: 'C19. Статистика по городам — из DataLens',
                isDone: audienceDone['cities'] || !!podcast.yandexAudience?.cities,
                isUploading: audienceUploading === 'cities',
                err: audienceErrors['cities'],
              },
            ] : null

            return (
              <div key={p.key}>
              <div
                className={`bg-white rounded-2xl p-5 border shadow-sm transition-all duration-200 ${
                  isUploading
                    ? 'border-[#b150e2] animate-pulse'
                    : dragOver === p.key
                      ? 'border-dashed border-[#b150e2] bg-[#b150e2]/5 scale-[1.01]'
                      : 'border-[#e5e5ea]'
                }`}
                onDragOver={e => { if (!anyUploading) { e.preventDefault(); setDragOver(p.key) } }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => {
                  e.preventDefault()
                  setDragOver(null)
                  if (!anyUploading) {
                    const file = e.dataTransfer.files?.[0]
                    if (file) handleFile(p.key, file)
                  }
                }}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.dot }} />
                    <div className="min-w-0">
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
                        onClick={() => setOpenGuide(prev => prev === p.key ? null : p.key)}
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

                  <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-shrink-0">
                    {isDone && !isUploading && (
                      <span className="animate-pop text-green-500 text-[18px] leading-none">✓</span>
                    )}
                    <label className={`min-w-0 flex-1 sm:w-auto sm:flex-none ${isBlocked ? 'pointer-events-none' : 'cursor-pointer'}`}>
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) handleFile(p.key, file)
                          e.target.value = ''
                        }}
                        disabled={anyUploading}
                      />
                      <span className={`${getCtaClasses({ tone: 'secondary', size: 'compact', fullWidth: true })} min-w-0 sm:w-auto ${
                        isBlocked
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-[#e5e5ea]'
                      }`}>
                        {isUploading ? (
                          <>
                            <svg className="animate-spin-smooth w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="none">
                              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
                              <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            Обрабатываю...
                          </>
                        ) : isDone ? 'Заменить' : 'Выбрать CSV'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Animated guide block */}
                <div
                  className="overflow-hidden transition-all duration-500 ease-in-out border-t border-transparent mt-2"
                  style={{ maxHeight: isGuideOpen ? '400px' : '0px' }}
                >
                  <div className="mt-3 bg-[#f5f5f7] rounded-xl p-3">
                    <ol className="space-y-1.5 list-decimal list-inside">
                      {p.guide.map((step, i) => (
                        <li key={i} className="text-[12px] text-[#3d3d3f] leading-relaxed">
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
                    {'note' in p && p.note && (
                      <p className="text-[11px] text-[#6e6e73] mt-2 pt-2 border-t border-[#e5e5ea]">{p.note}</p>
                    )}
                  </div>
                </div>

                {p.key === 'mave' && (
                  <div className="mt-4 rounded-xl border border-[#e5e5ea] bg-[#faf8ff] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-[13px] font-semibold text-[#1d1d1f]">Альтернатива без подписки: вставка текста</h4>
                          <span className="text-[10px] text-[#7b57c8] bg-white px-2 py-1 rounded-full border border-[#e5e5ea] whitespace-nowrap">
                            Альтернатива
                          </span>
                        </div>
                        <p className="text-[12px] text-[#6e6e73] mt-1 leading-relaxed">
                          Скопируй список выпусков со страницы Mave. Этот способ обновит актуальные накопленные значения на дату импорта, а если CSV уже был загружен, сохранит его историческую динамику.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setMaveTutorialOpen(prev => !prev)}
                      className="mt-3 flex w-full items-center justify-between rounded-xl border border-white/80 bg-white/80 px-4 py-3 text-left transition-colors hover:bg-white"
                    >
                      <div>
                        <p className="text-[13px] font-medium text-[#1d1d1f]">Как быстро скопировать данные из Mave</p>
                        <p className="mt-0.5 text-[12px] text-[#6e6e73]">Короткое видео и 3 шага прямо в карточке импорта</p>
                      </div>
                      <span
                        className="inline-block text-[#7b57c8] transition-transform duration-300"
                        style={{ transform: maveTutorialOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      >
                        ↓
                      </span>
                    </button>

                    <div
                      className="overflow-hidden transition-all duration-500 ease-in-out"
                      style={{ maxHeight: maveTutorialOpen ? '700px' : '0px', opacity: maveTutorialOpen ? 1 : 0 }}
                    >
                      <div className="mt-4 rounded-[24px] border border-[#e7e2f3] bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(246,241,255,0.86))] p-3 sm:p-4 shadow-[0_20px_50px_rgba(177,80,226,0.10)]">
                        <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
                        <div className="relative overflow-hidden rounded-2xl border border-[#ebe7f5] bg-[linear-gradient(135deg,#f6f1ff,#eef5ff)] p-4 shadow-sm">
                          <div className="pointer-events-none absolute inset-0">
                            <div className="absolute -top-8 left-6 h-24 w-24 rounded-full bg-[#b150e2]/15 blur-2xl" />
                            <div className="absolute bottom-0 right-6 h-24 w-24 rounded-full bg-[#0a84ff]/12 blur-2xl" />
                          </div>
                          <div className="relative">
                            <div className="mb-3 flex items-center justify-between gap-2">
                              <span className="rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#7b57c8]">
                                Видео-туториал
                              </span>
                              <span className="text-[11px] text-[#6e6e73]">ручное выделение + copy</span>
                            </div>
                            <div className="overflow-hidden rounded-[20px] border border-white/70 bg-white/70 shadow-[0_10px_30px_rgba(29,29,31,0.08)]">
                              <video
                                className="block aspect-[16/9] w-full bg-white object-cover"
                                src="/mave-paste-tutorial.fixed.mp4"
                                autoPlay
                                muted
                                loop
                                playsInline
                                controls
                              />
                            </div>
                            <p className="mt-3 text-[12px] text-[#6e6e73]">
                              Короткий ролик без звука показывает реальный жест: выделение нужного блока выпусков, копирование и вставку в сервис.
                            </p>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[#ebe7f5] bg-white p-5 sm:p-6 shadow-sm">
                          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8e8e93]">Сценарий</p>
                          <div className="mt-3 space-y-3">
                            {[
                              'Открой раздел «Выпуски» в Mave и прокрути до видимых карточек эпизодов.',
                              'Мышкой выдели только список выпусков и скопируй его через Cmd/Ctrl + C.',
                              'Вернись в Podcast Stats, вставь текст в поле и нажми «Распознать вставку».',
                            ].map((step, index) => (
                              <div key={step} className="flex items-start gap-3">
                                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#b150e2] text-[11px] font-semibold text-white">
                                  {index + 1}
                                </span>
                                <p className="text-[14px] leading-relaxed text-[#3d3d3f]">{step}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        </div>
                      </div>
                    </div>

                    <textarea
                      value={mavePasteText}
                      onChange={event => {
                        setMavePasteText(event.target.value)
                        setMavePastePreview([])
                        setMavePasteWarnings([])
                        if (mavePasteError) setMavePasteError('')
                      }}
                      placeholder="Вставь сюда скопированный текст со страницы выпусков Mave"
                      className="mt-3 min-h-[180px] w-full rounded-xl border border-[#e5e5ea] bg-white px-4 py-3 text-[13px] text-[#1d1d1f] placeholder-[#aeaeb2] focus:border-[#b150e2] focus:outline-none focus:ring-2 focus:ring-[#b150e2]/15"
                    />

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <button
                        onClick={handleMavePastePreview}
                        disabled={!mavePasteText.trim() || anyUploading}
                        className={getCtaClasses({
                          tone: 'secondary',
                          size: 'compact',
                          disabled: !mavePasteText.trim() || anyUploading,
                        })}
                      >
                        Распознать вставку
                      </button>
                      <button
                        onClick={handleMavePasteImport}
                        disabled={mavePastePreview.length === 0 || mavePasteWarnings.length > 0 || anyUploading}
                        className={getCtaClasses({
                          tone: 'primary',
                          size: 'compact',
                          disabled: mavePastePreview.length === 0 || mavePasteWarnings.length > 0 || anyUploading,
                        })}
                      >
                        Импортировать в Mave
                      </button>
                      {mavePastePreview.length > 0 && (
                        <span className="text-[12px] text-[#6e6e73]">
                          Распознано {mavePastePreview.length.toLocaleString('ru')} выпусков
                        </span>
                      )}
                    </div>

                    {mavePasteError && (
                      <p className="mt-3 text-[12px] text-red-500">{mavePasteError}</p>
                    )}

                    {mavePasteWarnings.length > 0 && (
                      <p className="mt-3 text-[12px] text-[#8e8e93]">
                        Нераспознанные блоки: {mavePasteWarnings.length}. Импорт отключён, пока текст не будет распознан полностью.
                      </p>
                    )}

                    {mavePastePreview.length > 0 && (
                      <div className="mt-3 overflow-hidden rounded-xl border border-[#ebe7f5] bg-white">
                        <div className="border-b border-[#f3f0fa] px-4 py-2 text-[12px] font-medium text-[#6e6e73]">
                          Preview перед импортом
                        </div>
                        <div className="max-h-[280px] overflow-y-auto">
                          <table className="w-full text-[12px]">
                            <thead className="sticky top-0 bg-white">
                              <tr className="text-left text-[#8e8e93]">
                                <th className="px-4 py-2 font-medium">Дата</th>
                                <th className="px-4 py-2 font-medium">Выпуск</th>
                                <th className="px-4 py-2 font-medium">Просл.</th>
                                <th className="px-4 py-2 font-medium">Видео</th>
                              </tr>
                            </thead>
                            <tbody>
                              {mavePastePreview.slice(0, 12).map(episode => (
                                <tr key={`${episode.publishDate}-${episode.title}`} className="border-t border-[#f5f5f7] align-top">
                                  <td className="px-4 py-2 whitespace-nowrap text-[#6e6e73]">{episode.publishDate}</td>
                                  <td className="px-4 py-2 text-[#1d1d1f]">
                                    <div>{episode.title}</div>
                                    <div className="mt-0.5 text-[11px] text-[#8e8e93]">
                                      {[episode.seasonLabel, episode.episodeNumber ? `${episode.episodeNumber} выпуск` : null, episode.durationLabel].filter(Boolean).join(' · ')}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-[#1d1d1f]">{episode.plays.toLocaleString('ru')}</td>
                                  <td className="px-4 py-2 whitespace-nowrap text-[#6e6e73]">{episode.videoViews.toLocaleString('ru')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {mavePastePreview.length > 12 && (
                          <p className="border-t border-[#f3f0fa] px-4 py-2 text-[11px] text-[#8e8e93]">
                            И ещё {mavePastePreview.length - 12} выпусков будут импортированы.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {showHint && (
                  <p className="text-[#aeaeb2] text-[12px] mt-3">→ Загрузи следующий источник</p>
                )}
              </div>

              {AUDIENCE_CARDS && (
                <div className="pl-4 ml-1 border-l-2 border-[#ff9f0a]/40 space-y-2">
                  {AUDIENCE_CARDS.map(card => (
                    <div
                      key={card.type}
                      className="bg-white rounded-xl p-3 border border-[#e5e5ea] shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                        <label className="w-full min-w-0 cursor-pointer sm:w-auto sm:flex-none">
                          <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0]
                              if (file) handleAudienceFile(card.type, file)
                              e.target.value = ''
                            }}
                            disabled={audienceUploading !== null}
                          />
                          <span className={`${getCtaClasses({ tone: 'secondary', size: 'compact', fullWidth: true })} min-w-0 text-[12px] sm:w-auto ${
                            audienceUploading !== null ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#e5e5ea]'
                          }`}>
                            {card.isUploading ? (
                              <>
                                <svg className="animate-spin-smooth w-3 h-3 flex-shrink-0" viewBox="0 0 16 16" fill="none">
                                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
                                  <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                Обрабатываю...
                              </>
                            ) : card.isDone ? 'Заменить' : 'Выбрать CSV'}
                          </span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            )
          })}

          {/* YouTube card — OAuth instead of CSV */}
          {(() => {
            const ytUploaded = podcast.uploadedPlatforms.find(u => u.platform === 'youtube')
            const ytFallbackPeriod = getPeriodFromPlays(podcast.rawPlays.filter(play => play.platform === 'youtube'))
            const ytPeriod = formatPeriod(
              ytUploaded?.periodStart ?? ytFallbackPeriod.periodStart,
              ytUploaded?.periodEnd ?? ytFallbackPeriod.periodEnd
            )
            const ytPreview = previews['youtube']
            const ytErr = errors['youtube']
            const ytDone = uploadedKeys.has('youtube') || !!ytPreview
            const ytBlocked = anyUploading || youtubeLoading

            return (
              <div
                className={`bg-white rounded-2xl p-5 border shadow-sm transition-all duration-200 ${
                  youtubeLoading ? 'border-[#ff0000] animate-pulse' : 'border-[#e5e5ea]'
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: YOUTUBE_PLATFORM.dot }} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-[#1d1d1f] text-[15px]">{YOUTUBE_PLATFORM.label}</h3>
                        {ytDone && (
                          <span className="text-[11px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium border border-green-100">
                            ✓ Готово
                          </span>
                        )}
                      </div>
                      <p className="text-[#aeaeb2] text-[12px] mt-0.5">{YOUTUBE_PLATFORM.desc}</p>
                      {ytUploaded && !ytPreview && (
                        <p className="text-[#aeaeb2] text-[11px] mt-1">{ytUploaded.recordsCount.toLocaleString('ru')} видео</p>
                      )}
                      {ytPreview && (
                        <p className="text-green-600 text-[11px] mt-1">{ytPreview.toLocaleString('ru')} видео</p>
                      )}
                      {ytPeriod && (
                        <p className="text-[#6e6e73] text-[11px] mt-1">Период: {ytPeriod}</p>
                      )}
                      {ytErr && <p className="text-red-500 text-[12px] mt-1">{ytErr}</p>}
                    </div>
                  </div>

                  <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-shrink-0">
                    {ytDone && !youtubeLoading && (
                      <span className="animate-pop text-green-500 text-[18px] leading-none">✓</span>
                    )}
                    <a
                      href={ytBlocked ? undefined : `/api/youtube/auth?podcastId=${podcastId}`}
                      className={`${getCtaClasses({ tone: 'secondary', size: 'compact', fullWidth: true })} min-w-0 flex-1 sm:w-auto sm:flex-none ${
                        ytBlocked
                          ? 'opacity-50 cursor-not-allowed pointer-events-none'
                          : 'hover:bg-[#e5e5ea]'
                      }`}
                    >
                      {youtubeLoading ? (
                        <>
                          <svg className="animate-spin-smooth w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
                            <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                          Подключаю...
                        </>
                      ) : ytDone ? 'Переподключить' : 'Подключить YouTube'}
                    </a>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>

        {/* Hint about consistent periods */}
        <p className="text-[12px] text-[#aeaeb2] text-center mt-4">
          💡 Для точной статистики выгружай данные за одинаковый период со всех платформ
        </p>

        {uploadedKeys.size > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push(`/${podcastId}/dashboard`)}
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
