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
