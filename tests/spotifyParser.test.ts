import test from 'node:test'
import assert from 'node:assert/strict'
import { parseSpotify } from '../lib/parsers/spotify'

test('parseSpotify parses comma-separated CSV with ISO release dates', () => {
  const csv = [
    'name,plays,streams,audience_size,releaseDate',
    'Эпизод 1,1500,1200,800,2026-04-15',
    'Эпизод 2,500,400,250,2026-04-08',
  ].join('\n')

  const result = parseSpotify(csv)
  assert.equal(result.length, 2)
  assert.deepEqual(result[0], {
    episodeTitle: 'Эпизод 1',
    platform: 'spotify',
    date: '2026-04-15',
    plays: 1500,
    streams: 1200,
    listeners: 800,
  })
})

test('parseSpotify strips BOM from first header', () => {
  const csv = [
    '﻿name,plays,streams,audience_size,releaseDate',
    'Эпизод BOM,100,80,50,2026-04-15',
  ].join('\n')

  const result = parseSpotify(csv)
  assert.equal(result.length, 1)
  assert.equal(result[0].episodeTitle, 'Эпизод BOM')
  assert.equal(result[0].plays, 100)
})

test('parseSpotify skips rows missing name or releaseDate', () => {
  const csv = [
    'name,plays,streams,audience_size,releaseDate',
    ',100,80,50,2026-04-15',
    'Эпизод без даты,200,150,100,',
    'Эпизод 3,300,250,180,2026-04-15',
  ].join('\n')

  const result = parseSpotify(csv)
  assert.equal(result.length, 1)
  assert.equal(result[0].episodeTitle, 'Эпизод 3')
})

test('parseSpotify defaults missing numbers to zero', () => {
  const csv = [
    'name,plays,streams,audience_size,releaseDate',
    'Эпизод 1,,,,2026-04-15',
  ].join('\n')

  const result = parseSpotify(csv)
  assert.equal(result.length, 1)
  assert.equal(result[0].plays, 0)
  assert.equal(result[0].streams, 0)
  assert.equal(result[0].listeners, 0)
})

test('parseSpotify returns empty array for header-only CSV', () => {
  const csv = 'name,plays,streams,audience_size,releaseDate'
  const result = parseSpotify(csv)
  assert.deepEqual(result, [])
})
