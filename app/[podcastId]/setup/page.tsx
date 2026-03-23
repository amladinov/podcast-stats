'use client'

import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { usePodcastStore } from '@/lib/store'
import { parseMave } from '@/lib/parsers/mave'
import { parseSpotify } from '@/lib/parsers/spotify'
import { parseYandex } from '@/lib/parsers/yandex'
import { parseVK } from '@/lib/parsers/vk'
import type { PlayRecord } from '@/types'

const PLATFORMS = [
  { key: 'mave' as const, label: 'Mave', desc: 'CSV с ежедневной статистикой из ЛК Mave', dot: '#b150e2' },
  { key: 'yandex' as const, label: 'Яндекс Музыка', desc: 'CSV из DataLens (разделитель — точка с запятой)', dot: '#ff9f0a' },
  { key: 'spotify' as const, label: 'Spotify', desc: 'CSV из Spotify for Podcasters', dot: '#30d158' },
  { key: 'vk' as const, label: 'ВКонтакте', desc: 'CSV из статистики VK (разделитель — точка с запятой)', dot: '#0a84ff' },
]

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
  const podcast = usePodcastStore(s => s.getPodcast(podcastId))
  const uploadPlays = usePodcastStore(s => s.uploadPlays)

  const [uploading, setUploading] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [previews, setPreviews] = useState<Record<string, number>>({})
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [lastUploadedKey, setLastUploadedKey] = useState<string | null>(null)

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
      })
      setPreviews(prev => ({ ...prev, [platform]: plays.length }))
      setLastUploadedKey(platform)
    } catch (e) {
      setErrors(prev => ({ ...prev, [platform]: e instanceof Error ? e.message : 'Ошибка' }))
    } finally {
      setUploading(null)
    }
  }, [podcastId, uploadPlays])

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
            <Image src={podcast.imageUrl} alt={podcast.title} width={36} height={36} className="rounded-lg object-cover shadow-sm" />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] font-semibold text-[#1d1d1f] truncate">{podcast.title}</h1>
            <p className="text-[#6e6e73] text-[12px]">{podcast.episodes.length} эпизодов</p>
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-[#6e6e73] text-[14px] mb-6">
          Загрузи CSV-файлы со статистикой. Можно загрузить один или все источники.
        </p>

        <div className="space-y-3">
          {PLATFORMS.map(p => {
            const uploaded = podcast.uploadedPlatforms.find(u => u.platform === p.key)
            const preview = previews[p.key]
            const err = errors[p.key]
            const isUploading = uploading === p.key
            const isDone = uploadedKeys.has(p.key) || !!preview
            const isBlocked = anyUploading && !isUploading
            const showHint = lastUploadedKey === p.key && uploadedKeys.size < PLATFORMS.length && !anyUploading

            return (
              <div
                key={p.key}
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.dot }} />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[#1d1d1f] text-[15px]">{p.label}</h3>
                        {isDone && (
                          <span className="text-[11px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium border border-green-100">
                            ✓ Готово
                          </span>
                        )}
                      </div>
                      <p className="text-[#aeaeb2] text-[12px] mt-0.5">{p.desc}</p>
                      {uploaded && !preview && (
                        <p className="text-[#aeaeb2] text-[11px] mt-1">{uploaded.fileName} · {uploaded.recordsCount.toLocaleString('ru')} записей</p>
                      )}
                      {preview && (
                        <p className="text-green-600 text-[11px] mt-1">{preview.toLocaleString('ru')} записей</p>
                      )}
                      {err && <p className="text-red-500 text-[12px] mt-1">{err}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isDone && !isUploading && (
                      <span className="animate-pop text-green-500 text-[18px] leading-none">✓</span>
                    )}
                    <label className={`flex-shrink-0 ${isBlocked ? 'pointer-events-none' : 'cursor-pointer'}`}>
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
                      <span className={`inline-flex items-center gap-1.5 text-[13px] bg-[#f5f5f7] text-[#1d1d1f] px-4 py-2 rounded-xl font-medium border border-[#e5e5ea] transition-all ${
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

                {showHint && (
                  <p className="text-[#aeaeb2] text-[12px] mt-3">→ Загрузи следующий источник</p>
                )}
              </div>
            )
          })}
        </div>

        {uploadedKeys.size > 0 && (
          <div className="mt-8 text-center">
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
