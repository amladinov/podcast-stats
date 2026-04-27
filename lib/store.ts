import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Podcast, PlayRecord, RSSEpisode, UploadedPlatform, YandexAudience } from '@/types'
import { normalizePodcastData } from './matcher'
import { DEMO_PODCASTS } from './demoData'
import { resolvePodcastCoverUrl } from './podcastCover'
import { deserializeStoreFromStorage, getStorageVersion, serializeStoreForStorage, type PersistedStoreV2 } from './storePersist'

interface PodcastStore {
  podcasts: Podcast[]
  addPodcast: (rssUrl: string, title: string, description: string | undefined, imageUrl: string | undefined, episodes: RSSEpisode[]) => string
  uploadPlays: (podcastId: string, plays: PlayRecord[], platform: UploadedPlatform) => void
  uploadYandexAudience: (podcastId: string, data: YandexAudience) => void
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
        const resolvedImageUrl = resolvePodcastCoverUrl({
          title,
          rssUrl,
          imageUrl,
          episodes,
        })
        const podcast: Podcast = {
          id,
          rssUrl,
          title,
          description,
          imageUrl: resolvedImageUrl,
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
            const filtered = p.rawPlays.filter(r => {
              if (r.platform !== platformInfo.platform) return true

              if (platformInfo.platform !== 'mave') {
                return false
              }

              if (platformInfo.sourceKind === 'csv') {
                return false
              }

              const recordSourceKind = r.sourceKind ?? 'csv'
              return recordSourceKind !== (platformInfo.sourceKind ?? 'csv')
            })
            const allPlays = [...filtered, ...newPlays]
            const freshNormalized = normalizePodcastData(p.episodes, allPlays)

            // Merge: preserve existing plays for other platforms.
            // rawPlays for other platforms are lost after navigation (not persisted),
            // but normalized data is persisted — so we keep it for all other platforms.
            const existingMap = new Map(p.normalized.map(e => [e.id, e]))
            const platform = platformInfo.platform

            const normalized = freshNormalized.map(ep => {
              const existing = existingMap.get(ep.id)
              if (!existing) return ep

              const plays = { ...existing.plays, [platform]: ep.plays[platform] }
              plays.total = plays.mave + plays.yandex + plays.spotify + plays.vk + plays.youtube

              const platformFields =
                platform === 'mave' ? {
                  timeline: platformInfo.sourceKind === 'paste' && existing.timeline.length > 0
                    ? existing.timeline
                    : ep.timeline,
                  maveVideoViews: ep.maveVideoViews,
                } :
                platform === 'yandex' ? {
                  yandexStarts: ep.yandexStarts,
                  yandexListeners: ep.yandexListeners,
                  yandexHours: ep.yandexHours,
                  yandexCompletionRate: ep.yandexCompletionRate,
                } :
                platform === 'spotify' ? {
                  spotifyStreams: ep.spotifyStreams,
                  spotifyAudience: ep.spotifyAudience,
                } :
                platform === 'youtube' ? {
                  youtubeViews: ep.youtubeViews,
                  youtubeLikes: ep.youtubeLikes,
                  youtubeComments: ep.youtubeComments,
                } : {}

              return { ...existing, plays, ...platformFields }
            })

            const platforms = p.uploadedPlatforms
              .filter(u => u.platform !== platformInfo.platform)
              .concat(platformInfo)
            return { ...p, rawPlays: allPlays, normalized, uploadedPlatforms: platforms }
          }),
        }))
      },

      uploadYandexAudience: (podcastId, data) => {
        set(state => ({
          podcasts: state.podcasts.map(p =>
            p.id === podcastId
              ? { ...p, yandexAudience: { ...p.yandexAudience, ...data } }
              : p
          ),
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
          const updated = state.podcasts.map(p => {
            const fresh = DEMO_PODCASTS.find(d => d.id === p.id)
            return fresh ? fresh : p
          })
          if (toAdd.length === 0) return { podcasts: updated }
          return { podcasts: [...toAdd, ...updated] }
        })
      },
    }),
    {
      name: 'podcast-stats-store',
      version: getStorageVersion(),
      partialize: (state): PersistedStoreV2 => serializeStoreForStorage(state),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(() => {
          const restored = deserializeStoreFromStorage(persistedState)
          return {
            ...restored,
            podcasts: restored.podcasts.map(podcast => ({
              ...podcast,
              imageUrl: resolvePodcastCoverUrl(podcast),
            })),
          }
        })(),
      }),
    }
  )
)
