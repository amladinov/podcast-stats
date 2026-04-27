import test from 'node:test'
import assert from 'node:assert/strict'
import type { Podcast } from '../types'
import { deserializeStoreFromStorage, serializeStoreForStorage } from '../lib/storePersist'

const runtimePodcast: Podcast = {
  id: 'podcast-1',
  rssUrl: 'https://example.com/feed.xml',
  title: 'Тестовый подкаст',
  description: 'Описание подкаста',
  imageUrl: 'https://example.com/cover.jpg',
  createdAt: '2026-04-05T00:00:00.000Z',
  rawPlays: [
    {
      episodeTitle: 'Первый выпуск',
      platform: 'mave',
      date: '2026-01-10',
      plays: 10,
      sourceKind: 'csv',
    },
  ],
  episodes: [
    {
      guid: 'ep-1',
      title: 'Первый выпуск',
      publishDate: '2026-01-10',
      duration: 1800,
      description: 'Описание выпуска',
      imageUrl: 'https://example.com/ep-1.jpg',
    },
  ],
  normalized: [
    {
      id: 'ep-1',
      title: 'Первый выпуск',
      publishDate: '2026-01-10',
      plays: {
        mave: 120,
        yandex: 230,
        spotify: 45,
        vk: 12,
        youtube: 67,
        total: 474,
      },
      timeline: [
        { date: '2026-01-10', plays: 20 },
        { date: '2026-01-11', plays: 35 },
        { date: '2026-01-15', plays: 65 },
      ],
      maveVideoViews: 8,
      yandexStarts: 300,
      yandexListeners: 200,
      yandexHours: 14,
      yandexCompletionRate: 62.5,
      spotifyStreams: 45,
      spotifyAudience: 28,
      youtubeViews: 67,
      youtubeLikes: 9,
      youtubeComments: 2,
    },
  ],
  uploadedPlatforms: [
    {
      platform: 'mave',
      fileName: 'mave.csv',
      recordsCount: 1,
      uploadedAt: '2026-04-05T00:00:00.000Z',
      sourceKind: 'csv',
      timelineSourceKind: 'csv',
      periodStart: '2026-01-10',
      periodEnd: '2026-01-15',
    },
    {
      platform: 'youtube',
      fileName: 'YouTube API',
      recordsCount: 1,
      uploadedAt: '2026-04-05T00:00:00.000Z',
      sourceKind: 'api',
      periodStart: '2026-01-10',
      periodEnd: '2026-01-10',
    },
  ],
  yandexAudience: {
    gender: { female: 10, male: 12, unknown: 1 },
    age: [
      { range: '18-24', count: 4 },
      { range: '25-34', count: 9 },
    ],
    cities: [
      {
        rank: 1,
        city: 'Москва',
        starts: 10,
        streams: 8,
        listeners: 5,
        hours: 2,
        avgListening: 24.5,
        completion: 31.2,
      },
    ],
  },
}

test('serialize -> deserialize preserves runtime podcast shape while dropping rawPlays', () => {
  const serialized = serializeStoreForStorage({ podcasts: [runtimePodcast] })
  const restored = deserializeStoreFromStorage(serialized)

  assert.equal(restored.podcasts.length, 1)
  assert.deepEqual(restored.podcasts[0], {
    ...runtimePodcast,
    rawPlays: [],
  })
})

test('legacy persisted store still hydrates and clears rawPlays', () => {
  const restored = deserializeStoreFromStorage({
    podcasts: [runtimePodcast],
  })

  assert.equal(restored.podcasts.length, 1)
  assert.deepEqual(restored.podcasts[0], {
    ...runtimePodcast,
    rawPlays: [],
  })
})

test('serialized format is more compact than persisting runtime podcast with rawPlays removed', () => {
  const serialized = JSON.stringify(serializeStoreForStorage({ podcasts: [runtimePodcast] }))
  const legacy = JSON.stringify({
    podcasts: [{ ...runtimePodcast, rawPlays: [] }],
  })

  assert.equal(serialized.length < legacy.length, true)
})
