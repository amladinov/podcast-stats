import type { Podcast } from '@/types'
import { normalizePodcastImageUrl } from './imageHosts'

const SKORO30_COVER = 'https://cdn.mave.digital/storage/podcasts/1f01963c-e6cd-4754-b920-033bb4ee32c3/images/8bb8f7c8-ab2b-4c1b-b16e-3e29c73288c3.png'

const COVER_BY_RSS: Record<string, string> = {
  'https://cloud.mave.digital/47474': SKORO30_COVER,
}

const BROKEN_IMAGE_REPLACEMENTS: Record<string, string> = {
  'https://cdn.mave.digital/storage/podcasts/1f01963c-e6cd-4754-b920-033bb4ee32c3/images/e5a9d33f-a913-4ba0-8bb7-8018c885bea1.jpg': SKORO30_COVER,
}

function normalizeUrlForLookup(value?: string): string {
  const normalized = normalizePodcastImageUrl(value ?? '')
  return normalized.replace(/\/$/, '')
}

function maybeReplaceBrokenImage(value?: string): string | undefined {
  if (!value) return undefined
  const normalized = normalizePodcastImageUrl(value)
  if (!normalized) return undefined
  return BROKEN_IMAGE_REPLACEMENTS[normalized] ?? normalized
}

export function resolvePodcastCoverUrl(
  podcast: Pick<Podcast, 'title' | 'rssUrl' | 'imageUrl' | 'episodes'>
): string | undefined {
  const channelImage = maybeReplaceBrokenImage(podcast.imageUrl)
  if (channelImage) return channelImage

  const rssKey = normalizeUrlForLookup(podcast.rssUrl)
  if (rssKey && COVER_BY_RSS[rssKey]) {
    return COVER_BY_RSS[rssKey]
  }

  if (podcast.title.trim().toLowerCase() === 'скоро 30') {
    return SKORO30_COVER
  }

  const episodeImage = podcast.episodes
    .map(episode => maybeReplaceBrokenImage(episode.imageUrl))
    .find(Boolean)

  return episodeImage
}
