import test from 'node:test'
import assert from 'node:assert/strict'
import { parseVKVideo } from '../lib/parsers/vkVideo'

test('parseVKVideo parses sample VK Video export', () => {
  const csv = [
    'Раздел;Подраздел;Дата;Время;Описание;Охват;Просмотры;Лайки;Комментарии;Поделились',
    'Видео;Контент;25.02.2026;21:05;КАК ЗАМОРОЗИТЬ ЯЙЦЕКЛЕТКУ: разговор с репродуктологом;408;454;1;0;0',
    'Видео;Контент;11.02.2026;19:55;КАК строить отношения с большой разницей в возрасте?;1 425;1 715;4;0;2',
    'Видео;Контент;05.12.2024;22:33;Как избежать ВЫГОРАНИЯ;582;801;7;0;4',
  ].join('\n')

  const result = parseVKVideo(csv)
  assert.equal(result.length, 3)
  assert.deepEqual(result[0], {
    episodeTitle: 'КАК ЗАМОРОЗИТЬ ЯЙЦЕКЛЕТКУ: разговор с репродуктологом',
    platform: 'vkvideo',
    date: '2026-02-25',
    plays: 454,
  })
  assert.equal(result[1].plays, 1715, 'space-separated thousands parsed')
  assert.equal(result[1].date, '2026-02-11')
  assert.equal(result[2].date, '2024-12-05')
})

test('parseVKVideo skips rows with zero views', () => {
  const csv = [
    'Раздел;Подраздел;Дата;Время;Описание;Охват;Просмотры;Лайки;Комментарии;Поделились',
    'Видео;Контент;01.01.2026;12:00;Empty;0;0;0;0;0',
    'Видео;Контент;02.01.2026;12:00;Real;100;50;1;0;0',
  ].join('\n')

  const result = parseVKVideo(csv)
  assert.equal(result.length, 1)
  assert.equal(result[0].episodeTitle, 'Real')
})

test('parseVKVideo filters out non-video sections if present', () => {
  const csv = [
    'Раздел;Подраздел;Дата;Время;Описание;Охват;Просмотры;Лайки;Комментарии;Поделились',
    'Реклама;Промо;01.01.2026;12:00;Promo banner;100;50;1;0;0',
    'Видео;Контент;02.01.2026;12:00;Real video;100;50;1;0;0',
  ].join('\n')

  const result = parseVKVideo(csv)
  assert.equal(result.length, 1)
  assert.equal(result[0].episodeTitle, 'Real video')
})

test('parseVKVideo handles empty input', () => {
  assert.deepEqual(parseVKVideo(''), [])
  assert.deepEqual(parseVKVideo('Раздел;Подраздел\n'), [])
})
