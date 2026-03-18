'use client'

import { useParams, useRouter } from 'next/navigation'
import { usePodcastStore } from '@/lib/store'
import { StatCards } from '@/components/dashboard/StatCards'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { PlatformChart } from '@/components/dashboard/PlatformChart'
import { EpisodeTable } from '@/components/dashboard/EpisodeTable'
import { AIInsights } from '@/components/dashboard/AIInsights'

export default function DashboardPage() {
  const { podcastId } = useParams<{ podcastId: string }>()
  const router = useRouter()
  const podcast = usePodcastStore(s => s.getPodcast(podcastId))

  if (!podcast) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-[#6e6e73]">Подкаст не найден</p>
        <button onClick={() => router.push('/')} className="mt-4 text-[#b150e2] text-sm hover:underline">На главную</button>
      </main>
    )
  }

  const episodes = podcast.normalized

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e5ea]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => router.push('/')} className="text-[#b150e2] text-[14px] font-medium hover:opacity-70 transition-opacity mr-2">
            ← Назад
          </button>
          {podcast.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={podcast.imageUrl} alt={podcast.title} className="w-10 h-10 rounded-xl object-cover shadow-sm" />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-[17px] font-semibold text-[#1d1d1f] truncate">{podcast.title}</h1>
            <p className="text-[#6e6e73] text-[12px]">{podcast.uploadedPlatforms.map(u => u.platform).join(', ')}</p>
          </div>
          <button
            onClick={() => router.push(`/${podcastId}/setup`)}
            className="text-[13px] bg-[#f5f5f7] hover:bg-[#e5e5ea] text-[#1d1d1f] px-4 py-2 rounded-xl transition-colors font-medium border border-[#e5e5ea] flex-shrink-0"
          >
            + Данные
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {episodes.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-[#6e6e73] mb-4 text-[15px]">Данных пока нет</p>
            <button onClick={() => router.push(`/${podcastId}/setup`)} className="text-[#b150e2] hover:underline text-[14px]">
              Загрузить CSV
            </button>
          </div>
        ) : (
          <>
            <StatCards episodes={episodes} rawPlays={podcast.rawPlays} />
            <TrendChart episodes={episodes} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-1">
                <PlatformChart episodes={episodes} rawPlays={podcast.rawPlays} />
              </div>
              <div className="md:col-span-2">
                <AIInsights episodes={episodes} podcastTitle={podcast.title} />
              </div>
            </div>
            <EpisodeTable episodes={episodes} />
          </>
        )}
      </main>
    </div>
  )
}
