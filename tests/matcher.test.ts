import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizePodcastData } from '../lib/matcher'
import type { PlayRecord, RSSEpisode } from '../types'

const episodes: RSSEpisode[] = [
  { guid: 'ep-1', title: 'Привет, мир!', publishDate: '2024-01-10' },
  { guid: 'ep-2', title: 'Большой разбор рынка', publishDate: '2024-01-17' },
  { guid: 'ep-3', title: 'Короткий выпуск', publishDate: '2024-01-24' },
]

test('exact title match ignores punctuation and casing', () => {
  const plays: PlayRecord[] = [
    {
      episodeTitle: '  привет мир  ',
      platform: 'spotify',
      date: '2024-01-10',
      plays: 42,
      streams: 30,
      listeners: 20,
    },
  ]

  const normalized = normalizePodcastData(episodes, plays)
  const matched = normalized.find(item => item.id === 'ep-1')
  assert.ok(matched)
  assert.equal(matched.plays.spotify, 42)
  assert.equal(matched.spotifyStreams, 30)
  assert.equal(matched.spotifyAudience, 20)
})

test('cyrillic quotes still match the same episode', () => {
  const plays: PlayRecord[] = [
    {
      episodeTitle: '«Привет мир»',
      platform: 'yandex',
      date: '',
      plays: 55,
      listeners: 12,
      streams: 7,
      completionRate: 66.6,
    },
  ]

  const normalized = normalizePodcastData(episodes, plays)
  const matched = normalized.find(item => item.id === 'ep-1')
  assert.ok(matched)
  assert.equal(matched.plays.yandex, 55)
  assert.equal(matched.yandexCompletionRate, 66.6)
})

test('yandex duplicate rows are accumulated with weighted completion rate', () => {
  const localEpisodes: RSSEpisode[] = [
    {
      guid: 'ep-yandex',
      title: 'Рынок труда глазами хедхантера / Роман Мазур',
      publishDate: '2024-01-10',
    },
  ]
  const plays: PlayRecord[] = [
    {
      episodeTitle: 'Роман Мазур: рынок труда глазами хедхантера',
      platform: 'yandex',
      date: '',
      plays: 349,
      listeners: 177,
      streams: 212,
      completionRate: 35.38,
    },
    {
      episodeTitle: 'Рынок труда глазами хедхантера / Роман Мазур',
      platform: 'yandex',
      date: '',
      plays: 258,
      listeners: 139,
      streams: 168,
      completionRate: 38.69,
    },
  ]

  const normalized = normalizePodcastData(localEpisodes, plays)
  const matched = normalized.find(item => item.id === 'ep-yandex')

  assert.ok(matched)
  assert.equal(matched.plays.yandex, 607)
  assert.equal(matched.yandexStarts, 607)
  assert.equal(matched.yandexListeners, 316)
  assert.equal(matched.yandexHours, 380)

  const expectedCompletionRate = (35.38 * 349 + 38.69 * 258) / 607
  assert.ok(matched.yandexCompletionRate !== undefined)
  assert.ok(Math.abs((matched.yandexCompletionRate ?? 0) - expectedCompletionRate) < 1e-9)
})

test('ambiguous yandex match falls back to the best score when anchor is absent', () => {
  const localEpisodes: RSSEpisode[] = [
    {
      guid: 'ep-b',
      title: 'Рынок труда глазами эйчар / Роман Мазур',
      publishDate: '2024-01-03',
    },
    {
      guid: 'ep-a',
      title: 'Рынок труда глазами хедхантера / Роман Мазур',
      publishDate: '2024-01-02',
    },
  ]
  const plays: PlayRecord[] = [
    {
      episodeTitle: 'Роман Мазур: рынок труда глазами',
      platform: 'yandex',
      date: '',
      plays: 40,
      listeners: 20,
      streams: 8,
      completionRate: 30,
    },
  ]

  const normalized = normalizePodcastData(localEpisodes, plays)
  assert.equal(normalized.find(item => item.id === 'ep-b')?.plays.yandex, 40)
  assert.equal(normalized.find(item => item.id === 'ep-a')?.plays.yandex, 0)
})

test('ambiguous yandex match uses anchor from a confident duplicate', () => {
  const localEpisodes: RSSEpisode[] = [
    {
      guid: 'ep-b',
      title: 'Рынок труда глазами эйчар / Роман Мазур',
      publishDate: '2024-01-03',
    },
    {
      guid: 'ep-a',
      title: 'Рынок труда глазами хедхантера / Роман Мазур',
      publishDate: '2024-01-02',
    },
  ]
  const plays: PlayRecord[] = [
    {
      episodeTitle: 'Рынок труда глазами хедхантера / Роман Мазур',
      platform: 'yandex',
      date: '',
      plays: 100,
      listeners: 50,
      streams: 20,
      completionRate: 50,
    },
    {
      episodeTitle: 'Роман Мазур: рынок труда глазами',
      platform: 'yandex',
      date: '',
      plays: 40,
      listeners: 20,
      streams: 8,
      completionRate: 30,
    },
  ]

  const normalized = normalizePodcastData(localEpisodes, plays)
  assert.equal(normalized.find(item => item.id === 'ep-a')?.plays.yandex, 140)
  assert.equal(normalized.find(item => item.id === 'ep-b')?.plays.yandex, 0)
})

test('partial title containment still matches the intended episode', () => {
  const plays: PlayRecord[] = [
    {
      episodeTitle: 'разбор рынка',
      platform: 'spotify',
      date: '2024-01-17',
      plays: 13,
    },
  ]

  const normalized = normalizePodcastData(episodes, plays)
  const matched = normalized.find(item => item.id === 'ep-2')
  assert.ok(matched)
  assert.equal(matched.plays.spotify, 13)
})

test('unrelated titles remain unmatched', () => {
  const plays: PlayRecord[] = [
    {
      episodeTitle: 'совсем другой эпизод',
      platform: 'spotify',
      date: '2024-01-01',
      plays: 99,
    },
  ]

  const normalized = normalizePodcastData(episodes, plays)
  assert.equal(normalized.every(item => item.plays.spotify === 0), true)
})

test('VK date matching uses exact date and nearest date within two days', () => {
  const plays: PlayRecord[] = [
    {
      episodeTitle: '',
      platform: 'vk',
      date: '17.01.2024',
      plays: 10,
    },
    {
      episodeTitle: '',
      platform: 'vk',
      date: '25.01.2024',
      plays: 5,
    },
  ]

  const normalized = normalizePodcastData(episodes, plays)
  assert.equal(normalized.find(item => item.id === 'ep-2')?.plays.vk, 10)
  assert.equal(normalized.find(item => item.id === 'ep-3')?.plays.vk, 5)
})

test('date matching ignores records outside the two-day window', () => {
  const plays: PlayRecord[] = [
    {
      episodeTitle: '',
      platform: 'vk',
      date: '30.01.2024',
      plays: 11,
    },
  ]

  const normalized = normalizePodcastData(episodes, plays)
  assert.equal(normalized.every(item => item.plays.vk === 0), true)
})

test('mixed imports preserve totals, youtube date fallback and sorted mave timeline', () => {
  const plays: PlayRecord[] = [
    {
      episodeTitle: 'Привет, мир!',
      platform: 'mave',
      date: '2024-03-01',
      plays: 7,
    },
    {
      episodeTitle: 'Привет, мир!',
      platform: 'mave',
      date: '2024-01-01',
      plays: 3,
    },
    {
      episodeTitle: 'другое название',
      platform: 'youtube',
      date: '2024-01-17',
      plays: 40,
      likes: 4,
      comments: 2,
    },
    {
      episodeTitle: 'Привет, мир!',
      platform: 'spotify',
      date: '2024-01-10',
      plays: 20,
    },
  ]

  const normalized = normalizePodcastData(episodes, plays)
  const ep1 = normalized.find(item => item.id === 'ep-1')
  const ep2 = normalized.find(item => item.id === 'ep-2')

  assert.ok(ep1)
  assert.ok(ep2)
  assert.deepEqual(ep1.timeline, [
    { date: '2024-01-01', plays: 3 },
    { date: '2024-03-01', plays: 7 },
  ])
  assert.equal(ep1.plays.mave, 10)
  assert.equal(ep1.plays.spotify, 20)
  assert.equal(ep1.plays.total, 30)
  assert.equal(ep2.plays.youtube, 40)
  assert.equal(ep2.youtubeLikes, 4)
  assert.equal(ep2.youtubeComments, 2)
})

test('mave snapshot overrides mave totals without polluting timeline', () => {
  const plays: PlayRecord[] = [
    {
      episodeTitle: 'Привет, мир!',
      platform: 'mave',
      date: '2024-01-01',
      plays: 3,
      sourceKind: 'csv',
    },
    {
      episodeTitle: 'Привет, мир!',
      platform: 'mave',
      date: '2024-03-01',
      plays: 7,
      sourceKind: 'csv',
    },
    {
      episodeTitle: 'Привет, мир!',
      platform: 'mave',
      date: '2024-01-10',
      plays: 40,
      sourceKind: 'paste',
      videoViews: 5,
    },
  ]

  const normalized = normalizePodcastData(episodes, plays)
  const ep1 = normalized.find(item => item.id === 'ep-1')

  assert.ok(ep1)
  assert.equal(ep1.plays.mave, 40)
  assert.equal(ep1.maveVideoViews, 5)
  assert.deepEqual(ep1.timeline, [
    { date: '2024-01-01', plays: 3 },
    { date: '2024-03-01', plays: 7 },
  ])
})
