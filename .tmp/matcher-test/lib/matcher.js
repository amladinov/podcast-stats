"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePodcastData = normalizePodcastData;
function normalize(str) {
    return str
        .toLowerCase()
        .replace(/[«»""''„"‹›]/g, '')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ') // \p{L} includes Cyrillic, Latin, etc.
        .replace(/\s+/g, ' ')
        .trim();
}
function getTokens(normalized) {
    return new Set(normalized.split(' ').filter(word => word.length > 3));
}
function similarity(queryNormalized, queryTokens, candidate) {
    if (queryNormalized === candidate.normalizedTitle)
        return 1;
    // Check if one contains the other (partial match)
    if (queryNormalized.includes(candidate.normalizedTitle) ||
        candidate.normalizedTitle.includes(queryNormalized)) {
        return 0.85;
    }
    if (queryTokens.size === 0 || candidate.tokens.size === 0)
        return 0;
    let overlap = 0;
    for (const token of queryTokens) {
        if (candidate.tokens.has(token))
            overlap++;
    }
    return overlap / Math.max(queryTokens.size, candidate.tokens.size);
}
function toTimestamp(isoDate) {
    const timestamp = new Date(isoDate).getTime();
    return Number.isNaN(timestamp) ? NaN : timestamp;
}
function buildEpisodeIndex(episodes) {
    const exactTitle = new Map();
    const publishDate = new Map();
    const tokenIndex = new Map();
    const ordered = episodes.map((episode, order) => {
        const normalizedTitle = normalize(episode.title);
        const tokens = getTokens(normalizedTitle);
        const indexed = {
            episode,
            normalizedTitle,
            tokens,
            publishTimestamp: toTimestamp(episode.publishDate),
            order,
        };
        const byTitle = exactTitle.get(normalizedTitle);
        if (byTitle)
            byTitle.push(indexed);
        else
            exactTitle.set(normalizedTitle, [indexed]);
        const byDate = publishDate.get(episode.publishDate);
        if (byDate)
            byDate.push(indexed);
        else
            publishDate.set(episode.publishDate, [indexed]);
        for (const token of tokens) {
            const bucket = tokenIndex.get(token);
            if (bucket)
                bucket.push(indexed);
            else
                tokenIndex.set(token, [indexed]);
        }
        return indexed;
    });
    return { exactTitle, publishDate, tokenIndex, ordered };
}
function chooseBestCandidate(candidates, targetTimestamp) {
    if (candidates.length === 0)
        return null;
    if (targetTimestamp === undefined || Number.isNaN(targetTimestamp))
        return candidates[0];
    const exact = candidates.find(candidate => candidate.publishTimestamp === targetTimestamp);
    if (exact)
        return exact;
    let best = null;
    let minDiff = Infinity;
    for (const candidate of candidates) {
        if (Number.isNaN(candidate.publishTimestamp))
            continue;
        const diff = Math.abs(candidate.publishTimestamp - targetTimestamp);
        const days = diff / (1000 * 60 * 60 * 24);
        if (days <= 2 && diff < minDiff) {
            minDiff = diff;
            best = candidate;
        }
    }
    return best ?? candidates[0];
}
function findEpisodeByTitle(index, title, isoDate) {
    const normalizedTitle = normalize(title);
    if (!normalizedTitle)
        return null;
    const targetTimestamp = isoDate ? toTimestamp(isoDate) : undefined;
    const exactMatches = index.exactTitle.get(normalizedTitle);
    if (exactMatches?.length) {
        return chooseBestCandidate(exactMatches, targetTimestamp)?.episode ?? null;
    }
    const queryTokens = getTokens(normalizedTitle);
    const narrowed = new Map();
    for (const token of queryTokens) {
        for (const candidate of index.tokenIndex.get(token) ?? []) {
            narrowed.set(candidate.episode.guid, candidate);
        }
    }
    const candidatePool = narrowed.size > 0 ? Array.from(narrowed.values()) : index.ordered;
    let best = null;
    let bestScore = 0.6; // minimum threshold
    for (const candidate of candidatePool) {
        const score = similarity(normalizedTitle, queryTokens, candidate);
        if (score > bestScore) {
            bestScore = score;
            best = candidate;
            continue;
        }
        if (best &&
            score === bestScore &&
            targetTimestamp !== undefined &&
            !Number.isNaN(targetTimestamp)) {
            const currentDiff = Number.isNaN(candidate.publishTimestamp)
                ? Infinity
                : Math.abs(candidate.publishTimestamp - targetTimestamp);
            const bestDiff = Number.isNaN(best.publishTimestamp)
                ? Infinity
                : Math.abs(best.publishTimestamp - targetTimestamp);
            if (currentDiff < bestDiff) {
                best = candidate;
            }
        }
    }
    return best?.episode ?? null;
}
function findEpisodeByDate(index, date) {
    // date is DD.MM.YYYY — convert to YYYY-MM-DD
    const parts = date.split('.');
    if (parts.length !== 3)
        return null;
    const iso = `${parts[2]}-${parts[1]}-${parts[0]}`;
    return findEpisodeByISODate(index, iso);
}
function findEpisodeByISODate(index, isoDate) {
    const exact = index.publishDate.get(isoDate);
    if (exact?.length)
        return exact[0].episode;
    const target = toTimestamp(isoDate);
    if (Number.isNaN(target))
        return null;
    let closest = null;
    let minDiff = Infinity;
    for (const candidate of index.ordered) {
        if (Number.isNaN(candidate.publishTimestamp))
            continue;
        const diff = Math.abs(candidate.publishTimestamp - target);
        const days = diff / (1000 * 60 * 60 * 24);
        if (days <= 2 && diff < minDiff) {
            minDiff = diff;
            closest = candidate;
        }
    }
    return closest?.episode ?? null;
}
function normalizePodcastData(episodes, plays) {
    const index = buildEpisodeIndex(episodes);
    // Build map keyed by episode guid
    const map = new Map();
    for (const indexed of index.ordered) {
        const { episode } = indexed;
        map.set(episode.guid, {
            id: episode.guid,
            title: episode.title,
            publishDate: episode.publishDate,
            plays: { mave: 0, yandex: 0, spotify: 0, vk: 0, youtube: 0, total: 0 },
            timeline: [],
        });
    }
    for (const record of plays) {
        let episode = null;
        if (record.platform === 'vk') {
            // VK has no title — match by date
            episode = findEpisodeByDate(index, record.date);
        }
        else if (record.platform === 'youtube') {
            // YouTube: try title first, fallback to date ±2 days
            episode = findEpisodeByTitle(index, record.episodeTitle, record.date);
            if (!episode && record.date) {
                episode = findEpisodeByISODate(index, record.date);
            }
        }
        else {
            episode = findEpisodeByTitle(index, record.episodeTitle);
        }
        if (!episode)
            continue;
        const norm = map.get(episode.guid);
        if (!norm)
            continue;
        if (record.platform === 'mave') {
            // Mave provides per-day records — accumulate into timeline
            norm.plays.mave += record.plays;
            norm.timeline.push({ date: record.date, plays: record.plays });
        }
        else if (record.platform === 'yandex') {
            norm.plays.yandex = record.plays; // total starts
            norm.yandexStarts = record.plays;
            norm.yandexListeners = record.listeners;
            norm.yandexHours = record.streams; // Яндекс "Стримы" → reuse streams field
            norm.yandexCompletionRate = record.completionRate;
        }
        else if (record.platform === 'spotify') {
            norm.plays.spotify = record.plays;
            norm.spotifyStreams = record.streams;
            norm.spotifyAudience = record.listeners;
        }
        else if (record.platform === 'vk') {
            norm.plays.vk += record.plays;
        }
        else if (record.platform === 'youtube') {
            norm.plays.youtube = record.plays;
            norm.youtubeViews = record.plays;
            norm.youtubeLikes = record.likes;
            norm.youtubeComments = record.comments;
        }
    }
    // Recalculate totals and sort timeline
    for (const norm of map.values()) {
        norm.plays.total =
            norm.plays.mave + norm.plays.yandex + norm.plays.spotify + norm.plays.vk + norm.plays.youtube;
        norm.timeline.sort((a, b) => a.date.localeCompare(b.date));
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
}
