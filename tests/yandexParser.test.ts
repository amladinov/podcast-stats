import test from 'node:test'
import assert from 'node:assert/strict'
import { parseYandex } from '../lib/parsers/yandex'
import { parseYandexAge } from '../lib/parsers/yandexAge'
import { parseYandexCities } from '../lib/parsers/yandexCities'
import { parseYandexGender } from '../lib/parsers/yandexGender'

test('parseYandex parses semicolon CSV with russian decimal separator', () => {
  const csv = [
    'Ранг;Эпизод;Старты;Слушатели;Стримы;Часы;Средний процент прослушивания, %;Процент дослушиваемости, %',
    '1;Эпизод 1;1 234;567;890;42;55,9;34,62',
    '2;Эпизод 2;100;50;80;5;72,3;48,1',
  ].join('\n')

  const result = parseYandex(csv)
  assert.equal(result.length, 2)
  assert.deepEqual(result[0], {
    episodeTitle: 'Эпизод 1',
    platform: 'yandex',
    date: '',
    plays: 1234,
    streams: 890,
    listeners: 567,
    completionRate: 34.62,
  })
  assert.equal(result[1].plays, 100)
  assert.equal(result[1].completionRate, 48.1)
})

test('parseYandex strips leading BOM from first header', () => {
  const csv = [
    '﻿Ранг;Эпизод;Старты;Слушатели;Стримы;Часы;Средний процент прослушивания, %;Процент дослушиваемости, %',
    '1;Эпизод BOM;500;100;200;10;50,0;25,0',
  ].join('\n')

  const result = parseYandex(csv)
  assert.equal(result.length, 1)
  assert.equal(result[0].episodeTitle, 'Эпизод BOM')
  assert.equal(result[0].plays, 500)
})

test('parseYandex returns empty array for CSV without data rows', () => {
  const csv = 'Ранг;Эпизод;Старты;Слушатели;Стримы;Часы;Средний процент прослушивания, %;Процент дослушиваемости, %'
  const result = parseYandex(csv)
  assert.deepEqual(result, [])
})

test('parseYandex skips rows with empty episode title', () => {
  const csv = [
    'Ранг;Эпизод;Старты;Слушатели;Стримы;Часы;Средний процент прослушивания, %;Процент дослушиваемости, %',
    '1;;100;50;80;5;50,0;25,0',
    '2;Эпизод 2;200;100;150;10;60,0;40,0',
  ].join('\n')

  const result = parseYandex(csv)
  assert.equal(result.length, 1)
  assert.equal(result[0].episodeTitle, 'Эпизод 2')
})

test('parseYandexGender parses diagonal-matrix CSV', () => {
  const csv = [
    'Пол;Женщины;Мужчины;Не определен',
    'Женщины;61590;;',
    'Мужчины;;59323;',
    'Не определен;;;17193',
  ].join('\n')

  const result = parseYandexGender(csv)
  assert.deepEqual(result, { female: 61590, male: 59323, unknown: 17193 })
})

test('parseYandexGender handles missing categories with zero', () => {
  const csv = [
    'Пол;Женщины;Мужчины;Не определен',
    'Женщины;1000;;',
  ].join('\n')

  const result = parseYandexGender(csv)
  assert.deepEqual(result, { female: 1000, male: 0, unknown: 0 })
})

test('parseYandexAge sorts ranges in ascending order', () => {
  const csv = [
    'Возраст;Не определен;55-99;45-54;35-44;25-34;18-24;0-17',
    'Не определен;12017;;;;;;',
    '25-34;;;;;56696;;',
    '35-44;;;;30000;;;',
    '0-17;;;;;;;500',
  ].join('\n')

  const result = parseYandexAge(csv)
  assert.equal(result[0].range, '0-17')
  assert.equal(result[0].count, 500)
  assert.equal(result[1].range, '25-34')
  assert.equal(result[2].range, '35-44')
  assert.equal(result[result.length - 1].range, 'Не определен')
})

test('parseYandexAge skips zero-count rows', () => {
  const csv = [
    'Возраст;25-34;35-44',
    '25-34;100;',
    '35-44;;0',
  ].join('\n')

  const result = parseYandexAge(csv)
  assert.equal(result.length, 1)
  assert.equal(result[0].range, '25-34')
})

test('parseYandexCities parses city rows with russian floats', () => {
  const csv = [
    'Ранг;Город;Старты;Стримы;Авторизованные слушатели;Часы;Средний процент прослушивания, %;Процент дослушиваемости, %',
    '1;Москва;78 418;42 408;27 072;15 633;55,9;34,62',
    '2;Санкт-Петербург;25 000;14 000;9 000;5 000;58,2;36,1',
  ].join('\n')

  const result = parseYandexCities(csv)
  assert.equal(result.length, 2)
  assert.deepEqual(result[0], {
    rank: 1,
    city: 'Москва',
    starts: 78418,
    streams: 42408,
    listeners: 27072,
    hours: 15633,
    avgListening: 55.9,
    completion: 34.62,
  })
  assert.equal(result[1].city, 'Санкт-Петербург')
})

test('parseYandexCities caps result at 50 cities', () => {
  const header = 'Ранг;Город;Старты;Стримы;Авторизованные слушатели;Часы;Средний процент прослушивания, %;Процент дослушиваемости, %'
  const rows = Array.from({ length: 60 }, (_, i) =>
    `${i + 1};Город ${i + 1};100;50;30;10;50,0;25,0`
  )
  const csv = [header, ...rows].join('\n')

  const result = parseYandexCities(csv)
  assert.equal(result.length, 50)
})
