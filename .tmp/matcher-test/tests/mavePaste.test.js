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
