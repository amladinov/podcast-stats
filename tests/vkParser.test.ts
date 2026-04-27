import test from 'node:test'
import assert from 'node:assert/strict'
import { parseVK } from '../lib/parsers/vk'

test('parseVK parses legacy episode-level export', () => {
  const csv = [
    'Раздел;Подраздел;Дата;Время;Эпизод;Добавили в избранное;Прослушивания;Поделились',
    'Подкасты;Эпизоды;17.01.2024;#;Эпизод 1;123;0;0',
    'Подкасты;Эпизоды;18.01.2024;#;Эпизод 2;0;0;0',
  ].join('\n')

  const result = parseVK(csv)
  assert.equal(result.length, 1)
  assert.deepEqual(result[0], {
    episodeTitle: '',
    platform: 'vk',
    date: '17.01.2024',
    plays: 123,
  })
})

test('parseVK rejects unsupported "Подкасты / Общее" export with clear message', () => {
  const csv = [
    'Раздел;Подраздел;Дата;Время;Вид данных;Сортировка: гранулярность;Сортировка: вид разреза;Параметр легенды;Значение',
    'Подкасты;Общее;01.01.2026;#;Прослушивания;По дням;#;Прослушивания;10',
  ].join('\n')

  assert.throws(
    () => parseVK(csv),
    /Подкасты \/ Общее/
  )
})
