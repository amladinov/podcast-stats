'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, useRef } from 'react'
import { SafePodcastImage } from '@/components/SafePodcastImage'
import { usePodcastStore } from '@/lib/store'
import { parseMave } from '@/lib/parsers/mave'
import { parseSpotify } from '@/lib/parsers/spotify'
import { parseYandex } from '@/lib/parsers/yandex'
import { parseVK } from '@/lib/parsers/vk'
import { parseYandexGender } from '@/lib/parsers/yandexGender'
import { parseYandexAge } from '@/lib/parsers/yandexAge'
import { parseYandexCities } from '@/lib/parsers/yandexCities'
import { formatPeriod, getEpisodeRangeFromNormalized, getPeriodFromPlays } from '@/lib/platformPeriods'
import type { PlayRecord, YandexAudience } from '@/types'

type GuidePart = { t: 'text'; v: string } | { t: 'link'; label: string; url: string }
type GuideStep = GuidePart[]

const PLATFORMS = [
  {
    key: 'mave' as const,
    label: 'Mave',
    desc: 'CSV с ежедневной статистикой из ЛК Mave',
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

function parsePlatform(platform: string, text: string): PlayRecord[] {
  if (platform === 'mave') return parseMave(text)
  if (platform === 'yandex') return parseYandex(text)
  if (platform === 'spotify') return parseSpotify(text)
  if (platform === 'vk') return parseVK(text)
  return []
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
  const ytImportDone = useRef(false)

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

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <div className="bg-white border-b border-[#e5e5ea]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
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

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
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
                      {currentPeriod && (
                        <p className="text-[#6e6e73] text-[11px] mt-1">Период: {currentPeriod}</p>
                      )}
                      {!currentPeriod && yandexEpisodesLabel && (
                        <p className="text-[#6e6e73] text-[11px] mt-1">Выпуски: {yandexEpisodesLabel}</p>
                      )}
                      {err && <p className="text-red-500 text-[12px] mt-1">{err}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                    {isDone && !isUploading && (
                      <span className="animate-pop text-green-500 text-[18px] leading-none">✓</span>
                    )}
                    <label className={`flex-shrink-0 w-full sm:w-auto ${isBlocked ? 'pointer-events-none' : 'cursor-pointer'}`}>
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
                      <span className={`inline-flex items-center justify-center gap-1.5 text-[13px] bg-[#f5f5f7] text-[#1d1d1f] px-4 py-2 rounded-xl font-medium border border-[#e5e5ea] transition-all w-full sm:w-auto ${
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
                        <label className="flex-shrink-0 cursor-pointer w-full sm:w-auto">
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
                          <span className={`inline-flex items-center justify-center gap-1.5 text-[12px] bg-[#f5f5f7] text-[#1d1d1f] px-3 py-1.5 rounded-lg font-medium border border-[#e5e5ea] transition-all w-full sm:w-auto ${
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

                  <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                    {ytDone && !youtubeLoading && (
                      <span className="animate-pop text-green-500 text-[18px] leading-none">✓</span>
                    )}
                    <a
                      href={ytBlocked ? undefined : `/api/youtube/auth?podcastId=${podcastId}`}
                      className={`inline-flex items-center justify-center gap-1.5 text-[13px] bg-[#f5f5f7] text-[#1d1d1f] px-4 py-2 rounded-xl font-medium border border-[#e5e5ea] transition-all w-full sm:w-auto ${
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
              className="bg-[#b150e2] hover:bg-[#9a3fd1] text-white px-8 py-3 rounded-2xl font-semibold text-[15px] transition-colors shadow-sm"
            >
              Открыть дашборд
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
