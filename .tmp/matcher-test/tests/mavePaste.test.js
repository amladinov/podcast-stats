"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const mavePaste_1 = require("../lib/parsers/mavePaste");
(0, node_test_1.default)('parseMavePaste parses seasons, multi-line titles and spaced integers', () => {
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
  `;
    const result = (0, mavePaste_1.parseMavePaste)(input);
    strict_1.default.equal(result.episodes.length, 2);
    strict_1.default.equal(result.warnings.length, 0);
    strict_1.default.deepEqual(result.episodes[0], {
        seasonLabel: '5 сезон',
        episodeNumber: 3,
        publishDate: '2026-03-26',
        title: '«Спрос есть». Успокаивающий выпуск о кризисе и пути предпринимателя.',
        durationLabel: '48:54',
        plays: 1551,
        videoViews: 0,
    });
    strict_1.default.equal(result.episodes[1]?.seasonLabel, 'Без сезона');
    strict_1.default.equal(result.episodes[1]?.episodeNumber, undefined);
    strict_1.default.equal(result.episodes[1]?.publishDate, '2022-10-04');
    strict_1.default.equal(result.episodes[1]?.title, 'Трейлер подкаста «Совет Директоров»');
});
(0, node_test_1.default)('parseMavePaste parses date-first Mave cards and optional "Видеовыпуск" line', () => {
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
  `;
    const result = (0, mavePaste_1.parseMavePaste)(input);
    strict_1.default.equal(result.episodes.length, 2);
    strict_1.default.equal(result.warnings.length, 0);
    strict_1.default.equal(result.episodes[0]?.seasonLabel, '5 сезон');
    strict_1.default.equal(result.episodes[0]?.publishDate, '2026-04-16');
    strict_1.default.equal(result.episodes[0]?.plays, 517);
    strict_1.default.equal(result.episodes[0]?.videoViews, 0);
    strict_1.default.equal(result.episodes[1]?.publishDate, '2026-02-11');
    strict_1.default.equal(result.episodes[1]?.plays, 793);
    strict_1.default.equal(result.episodes[1]?.videoViews, 40);
});
(0, node_test_1.default)('parseMavePaste accepts missing video views line and defaults to zero', () => {
    const input = `
1 сезон
27 нояб. 2024

1. Что такое любовь?

29:20
231
  `;
    const result = (0, mavePaste_1.parseMavePaste)(input);
    strict_1.default.equal(result.episodes.length, 1);
    strict_1.default.equal(result.warnings.length, 0);
    strict_1.default.equal(result.episodes[0]?.publishDate, '2024-11-27');
    strict_1.default.equal(result.episodes[0]?.plays, 231);
    strict_1.default.equal(result.episodes[0]?.videoViews, 0);
});
