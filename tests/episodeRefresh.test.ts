import test from 'node:test'
import assert from 'node:assert/strict'
import { applyEpisodeRefresh } from '../lib/episodeRefresh'
import { normalizePodcastData } from '../lib/matcher'
import type { NormalizedEpisode, PlayRecord, RSSEpisode } from '../types'

function rss(guid: string, title: string, publishDate: string): RSSEpisode {
  return { guid, title, publishDate }
}

function norm(id: string, title: string, publishDate: string, yandex: number): NormalizedEpisode {
  return {
    id,
    title,
    publishDate,
    plays: { mave: 0, yandex, spotify: 0, vk: 0, vkvideo: 0, youtube: 0, total: yandex },
    timeline: [],
  }
}

test('new episode is added on top, old platform data preserved, id stays in sync with skeleton', () => {
  const oldEpisodes = [
    rss('g1', 'Первый', '2024-01-10'),
    rss('g2', 'Второй', '2024-01-17'),
  ]
  const oldPlays: PlayRecord[] = [
    { episodeTitle: 'Первый', platform: 'yandex', date: '', plays: 100, listeners: 10 },
    { episodeTitle: 'Второй', platform: 'spotify', date: '2024-01-17', plays: 50 },
  ]
  const normalized = normalizePodcastData(oldEpisodes, oldPlays)

  const fresh = [
    rss('g3', 'Третий свежий', '2024-01-24'),
    rss('g1', 'Первый', '2024-01-10'),
    rss('g2', 'Второй', '2024-01-17'),
  ]
  const result = applyEpisodeRefresh({ episodes: oldEpisodes, normalized }, fresh)

  assert.equal(result.normalized.length, 3)
  assert.equal(result.added, 1)
  // sorted desc — newest first
  assert.equal(result.normalized[0].id, 'g3')
  // old data preserved
  assert.equal(result.normalized.find(n => n.id === 'g1')!.plays.yandex, 100)
  assert.equal(result.normalized.find(n => n.id === 'g2')!.plays.spotify, 50)
  // new episode empty
  assert.equal(result.normalized.find(n => n.id === 'g3')!.plays.total, 0)
  // invariant: every normalized.id exists as an episode guid
  const guids = new Set(result.episodes.map(e => e.guid))
  for (const n of result.normalized) assert.ok(guids.has(n.id), `id ${n.id} missing from skeleton`)
})

test('positional ep-N guids that shift do NOT smear data onto wrong episodes', () => {
  const oldEpisodes = [
    rss('ep-0', 'Маркетинг', '2024-02-10'),
    rss('ep-1', 'Брендинг', '2024-02-03'),
  ]
  const oldPlays: PlayRecord[] = [
    { episodeTitle: 'Маркетинг', platform: 'yandex', date: '', plays: 200 },
    { episodeTitle: 'Брендинг', platform: 'yandex', date: '', plays: 300 },
  ]
  const normalized = normalizePodcastData(oldEpisodes, oldPlays)

  // New episode prepended → indices shift by one.
  const fresh = [
    rss('ep-0', 'Аналитика', '2024-02-17'),
    rss('ep-1', 'Маркетинг', '2024-02-10'),
    rss('ep-2', 'Брендинг', '2024-02-03'),
  ]
  const result = applyEpisodeRefresh({ episodes: oldEpisodes, normalized }, fresh)

  const a = result.normalized.find(n => n.title === 'Маркетинг')!
  const b = result.normalized.find(n => n.title === 'Брендинг')!
  const c = result.normalized.find(n => n.title === 'Аналитика')!
  assert.equal(a.id, 'ep-1')
  assert.equal(a.plays.yandex, 200) // would be wiped by a guid-first match
  assert.equal(b.id, 'ep-2')
  assert.equal(b.plays.yandex, 300)
  assert.equal(c.id, 'ep-0')
  assert.equal(c.plays.yandex, 0) // new episode must NOT inherit ep-0's old data
  assert.equal(result.added, 1)
})

test('idempotent — re-applying the same feed changes nothing', () => {
  const oldEpisodes = [rss('g1', 'A', '2024-01-10'), rss('g2', 'B', '2024-01-17')]
  const normalized = normalizePodcastData(oldEpisodes, [
    { episodeTitle: 'A', platform: 'yandex', date: '', plays: 10 },
  ])
  const fresh = [rss('g3', 'C', '2024-01-24'), rss('g1', 'A', '2024-01-10'), rss('g2', 'B', '2024-01-17')]

  const once = applyEpisodeRefresh({ episodes: oldEpisodes, normalized }, fresh)
  const twice = applyEpisodeRefresh({ episodes: once.episodes, normalized: once.normalized }, fresh)

  assert.deepEqual(twice.normalized, once.normalized)
  assert.equal(twice.added, 0)
})

test('title+date collision keeps both records without duplication', () => {
  const oldEpisodes = [rss('gA', 'Дубль', '2024-03-01'), rss('gB', 'Дубль', '2024-03-01')]
  const normalized = [norm('gA', 'Дубль', '2024-03-01', 111), norm('gB', 'Дубль', '2024-03-01', 222)]
  const fresh = [rss('gA', 'Дубль', '2024-03-01'), rss('gB', 'Дубль', '2024-03-01')]

  const result = applyEpisodeRefresh({ episodes: oldEpisodes, normalized }, fresh)

  assert.equal(result.normalized.length, 2)
  const values = result.normalized.map(n => n.plays.yandex).sort((x, y) => x - y)
  assert.deepEqual(values, [111, 222])
})

test('renamed title with stable guid keeps data via guid fallback', () => {
  const oldEpisodes = [rss('g1', 'Старое название', '2024-04-01')]
  const normalized = [norm('g1', 'Старое название', '2024-04-01', 500)]
  const fresh = [rss('g1', 'Новое исправленное название', '2024-04-01')]

  const result = applyEpisodeRefresh({ episodes: oldEpisodes, normalized }, fresh)

  const ep = result.normalized.find(n => n.id === 'g1')!
  assert.equal(ep.title, 'Новое исправленное название')
  assert.equal(ep.plays.yandex, 500)
})

test('empty feed returns current unchanged', () => {
  const oldEpisodes = [rss('g1', 'A', '2024-01-10')]
  const normalized = normalizePodcastData(oldEpisodes, [])
  const result = applyEpisodeRefresh({ episodes: oldEpisodes, normalized }, [])

  assert.equal(result.episodes, oldEpisodes)
  assert.equal(result.normalized, normalized)
  assert.equal(result.added, 0)
})
