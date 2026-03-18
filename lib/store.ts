import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Podcast, PlayRecord, RSSEpisode, NormalizedEpisode, UploadedPlatform } from '@/types'
import { normalizePodcastData } from './matcher'
import { DEMO_PODCASTS } from './demoData'

interface PodcastStore {
  podcasts: Podcast[]
  addPodcast: (rssUrl: string, title: string, description: string | undefined, imageUrl: string | undefined, episodes: RSSEpisode[]) => string
  uploadPlays: (podcastId: string, plays: PlayRecord[], platform: UploadedPlatform) => void
  removePodcast: (podcastId: string) => void
  getPodcast: (podcastId: string) => Podcast | undefined
  loadDemo: () => void
}

export const usePodcastStore = create<PodcastStore>()(
  persist(
    (set, get) => ({
      podcasts: [],

      addPodcast: (rssUrl, title, description, imageUrl, episodes) => {
        const id = crypto.randomUUID()
        const podcast: Podcast = {
          id,
          rssUrl,
          title,
          description,
          imageUrl,
          episodes,
          rawPlays: [],
          normalized: [],
          uploadedPlatforms: [],
          createdAt: new Date().toISOString(),
        }
        set(state => ({ podcasts: [...state.podcasts, podcast] }))
        return id
      },

      uploadPlays: (podcastId, newPlays, platformInfo) => {
        set(state => ({
          podcasts: state.podcasts.map(p => {
            if (p.id !== podcastId) return p
            // Remove old plays from this platform and add new ones
            const filtered = p.rawPlays.filter(r => r.platform !== platformInfo.platform)
            const allPlays = [...filtered, ...newPlays]
            const normalized = normalizePodcastData(p.episodes, allPlays)
            const platforms = p.uploadedPlatforms
              .filter(u => u.platform !== platformInfo.platform)
              .concat(platformInfo)
            return { ...p, rawPlays: allPlays, normalized, uploadedPlatforms: platforms }
          }),
        }))
      },

      removePodcast: (podcastId) => {
        set(state => ({ podcasts: state.podcasts.filter(p => p.id !== podcastId) }))
      },

      getPodcast: (podcastId) => {
        return get().podcasts.find(p => p.id === podcastId)
      },

      loadDemo: () => {
        set(state => {
          const existingIds = new Set(state.podcasts.map(p => p.id))
          const toAdd = DEMO_PODCASTS.filter(p => !existingIds.has(p.id))
          // Update imageUrl for existing demo podcasts (in case cache is stale)
          const updated = state.podcasts.map(p => {
            const fresh = DEMO_PODCASTS.find(d => d.id === p.id)
            return fresh ? { ...p, imageUrl: fresh.imageUrl } : p
          })
          if (toAdd.length === 0) return { podcasts: updated }
          return { podcasts: [...toAdd, ...updated] }
        })
      },
    }),
    { name: 'podcast-stats-store' }
  )
)
