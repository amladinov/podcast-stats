import test from 'node:test'
import assert from 'node:assert/strict'
import { parseMavePaste } from '../lib/parsers/mavePaste'

test('parseMavePaste parses seasons, multi-line titles and spaced integers', () => {
  const input = `
5 сезон
3 выпуск

26 мар. 2026

«Спрос есть». Успокаивающий выпуск
о кризисе и пути предпринимателя.

48:54
1 551

0
Без сезона
4 окт. 2022

Трейлер подкаста «Совет Директоров»

02:36
620

0
  `

  const result = parseMavePaste(input)

  assert.equal(result.episodes.length, 2)
  assert.equal(result.warnings.length, 0)
  assert.deepEqual(result.episodes[0], {
    seasonLabel: '5 сезон',
    episodeNumber: 3,
    publishDate: '2026-03-26',
    title: '«Спрос есть». Успокаивающий выпуск о кризисе и пути предпринимателя.',
    durationLabel: '48:54',
    plays: 1551,
    videoViews: 0,
  })
  assert.equal(result.episodes[1]?.seasonLabel, 'Без сезона')
  assert.equal(result.episodes[1]?.episodeNumber, undefined)
  assert.equal(result.episodes[1]?.publishDate, '2022-10-04')
  assert.equal(result.episodes[1]?.title, 'Трейлер подкаста «Совет Директоров»')
})

test('parseMavePaste parses date-first Mave cards and optional "Видеовыпуск" line', () => {
  const input = `
5 сезон
16 апр. 2026

«АМБИЦИИ или ТРЕВОГА?» мы правда хотим больше или боимся быть обычными?

41:47
517

0
11 февр. 2026

«ОН СТАРШЕ НА 10 ЛЕТ!»: как строить отношения с большой разницей в возрасте?

30:02
Видеовыпуск
793

40
  `

  const result = parseMavePaste(input)

  assert.equal(result.episodes.length, 2)
  assert.equal(result.warnings.length, 0)
  assert.equal(result.episodes[0]?.seasonLabel, '5 сезон')
  assert.equal(result.episodes[0]?.publishDate, '2026-04-16')
  assert.equal(result.episodes[0]?.plays, 517)
  assert.equal(result.episodes[0]?.videoViews, 0)
  assert.equal(result.episodes[1]?.publishDate, '2026-02-11')
  assert.equal(result.episodes[1]?.plays, 793)
  assert.equal(result.episodes[1]?.videoViews, 40)
})
