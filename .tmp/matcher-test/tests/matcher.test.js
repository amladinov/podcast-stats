"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const matcher_1 = require("../lib/matcher");
const episodes = [
    { guid: 'ep-1', title: 'Привет, мир!', publishDate: '2024-01-10' },
    { guid: 'ep-2', title: 'Большой разбор рынка', publishDate: '2024-01-17' },
    { guid: 'ep-3', title: 'Короткий выпуск', publishDate: '2024-01-24' },
];
(0, node_test_1.default)('exact title match ignores punctuation and casing', () => {
    const plays = [
        {
            episodeTitle: '  привет мир  ',
            platform: 'spotify',
            date: '2024-01-10',
            plays: 42,
            streams: 30,
            listeners: 20,
        },
    ];
    const normalized = (0, matcher_1.normalizePodcastData)(episodes, plays);
    const matched = normalized.find(item => item.id === 'ep-1');
    strict_1.default.ok(matched);
    strict_1.default.equal(matched.plays.spotify, 42);
    strict_1.default.equal(matched.spotifyStreams, 30);
    strict_1.default.equal(matched.spotifyAudience, 20);
});
(0, node_test_1.default)('cyrillic quotes still match the same episode', () => {
    const plays = [
        {
            episodeTitle: '«Привет мир»',
            platform: 'yandex',
            date: '',
            plays: 55,
            listeners: 12,
            streams: 7,
            completionRate: 66.6,
        },
    ];
    const normalized = (0, matcher_1.normalizePodcastData)(episodes, plays);
    const matched = normalized.find(item => item.id === 'ep-1');
    strict_1.default.ok(matched);
    strict_1.default.equal(matched.plays.yandex, 55);
    strict_1.default.equal(matched.yandexCompletionRate, 66.6);
});
(0, node_test_1.default)('partial title containment still matches the intended episode', () => {
    const plays = [
        {
            episodeTitle: 'разбор рынка',
            platform: 'spotify',
            date: '2024-01-17',
            plays: 13,
        },
    ];
    const normalized = (0, matcher_1.normalizePodcastData)(episodes, plays);
    const matched = normalized.find(item => item.id === 'ep-2');
    strict_1.default.ok(matched);
    strict_1.default.equal(matched.plays.spotify, 13);
});
(0, node_test_1.default)('unrelated titles remain unmatched', () => {
    const plays = [
        {
            episodeTitle: 'совсем другой эпизод',
            platform: 'spotify',
            date: '2024-01-01',
            plays: 99,
        },
    ];
    const normalized = (0, matcher_1.normalizePodcastData)(episodes, plays);
    strict_1.default.equal(normalized.every(item => item.plays.spotify === 0), true);
});
(0, node_test_1.default)('VK date matching uses exact date and nearest date within two days', () => {
    const plays = [
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
    ];
    const normalized = (0, matcher_1.normalizePodcastData)(episodes, plays);
    strict_1.default.equal(normalized.find(item => item.id === 'ep-2')?.plays.vk, 10);
    strict_1.default.equal(normalized.find(item => item.id === 'ep-3')?.plays.vk, 5);
});
(0, node_test_1.default)('date matching ignores records outside the two-day window', () => {
    const plays = [
        {
            episodeTitle: '',
            platform: 'vk',
            date: '30.01.2024',
            plays: 11,
        },
    ];
    const normalized = (0, matcher_1.normalizePodcastData)(episodes, plays);
    strict_1.default.equal(normalized.every(item => item.plays.vk === 0), true);
});
(0, node_test_1.default)('mixed imports preserve totals, youtube date fallback and sorted mave timeline', () => {
    const plays = [
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
    ];
    const normalized = (0, matcher_1.normalizePodcastData)(episodes, plays);
    const ep1 = normalized.find(item => item.id === 'ep-1');
    const ep2 = normalized.find(item => item.id === 'ep-2');
    strict_1.default.ok(ep1);
    strict_1.default.ok(ep2);
    strict_1.default.deepEqual(ep1.timeline, [
        { date: '2024-01-01', plays: 3 },
        { date: '2024-03-01', plays: 7 },
    ]);
    strict_1.default.equal(ep1.plays.mave, 10);
    strict_1.default.equal(ep1.plays.spotify, 20);
    strict_1.default.equal(ep1.plays.total, 30);
    strict_1.default.equal(ep2.plays.youtube, 40);
    strict_1.default.equal(ep2.youtubeLikes, 4);
    strict_1.default.equal(ep2.youtubeComments, 2);
});
