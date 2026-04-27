import test from 'node:test'
import assert from 'node:assert/strict'
import { parseMave } from '../lib/parsers/mave'

test('parseMave aggregates daily pivot rows into per-episode monthly records', () => {
  const csv = [
    'Выпуск,01.04.2026,02.04.2026,15.04.2026,01.05.2026',
    'Эпизод 1,100,50,200,300',
    'Эпизод 2,10,20,30,40',
  ].join('\n')

  const result = parseMave(csv)
  // Эпизод 1: april (100+50+200=350) + may (300) = 2 записи
  // Эпизод 2: april (10+20+30=60) + may (40) = 2 записи
  assert.equal(result.length, 4)

  const ep1April = result.find(r => r.episodeTitle === 'Эпизод 1' && r.date === '2026-04-01')
  const ep1May = result.find(r => r.episodeTitle === 'Эпизод 1' && r.date === '2026-05-01')
  assert.equal(ep1April?.plays, 350)
  assert.equal(ep1May?.plays, 300)
  assert.equal(ep1April?.platform, 'mave')
  assert.equal(ep1April?.sourceKind, 'csv')
})

test('parseMave strips BOM and parses correctly', () => {
  const csv = [
    '﻿Выпуск,01.04.2026,02.04.2026',
    'Эпизод BOM,100,50',
  ].join('\n')

  const result = parseMave(csv)
  assert.equal(result.length, 1)
  assert.equal(result[0].episodeTitle, 'Эпизод BOM')
  assert.equal(result[0].plays, 150)
})

test('parseMave skips zero and missing cells', () => {
  const csv = [
    'Выпуск,01.04.2026,02.04.2026,03.04.2026',
    'Эпизод 1,0,,100',
  ].join('\n')

  const result = parseMave(csv)
  assert.equal(result.length, 1)
  assert.equal(result[0].plays, 100)
})

test('parseMave returns empty array when only header is present', () => {
  const csv = 'Выпуск,01.04.2026,02.04.2026'
  const result = parseMave(csv)
  assert.deepEqual(result, [])
})

test('parseMave skips rows with empty episode title', () => {
  const csv = [
    'Выпуск,01.04.2026',
    ',100',
    'Эпизод 2,200',
  ].join('\n')

  const result = parseMave(csv)
  assert.equal(result.length, 1)
  assert.equal(result[0].episodeTitle, 'Эпизод 2')
})
