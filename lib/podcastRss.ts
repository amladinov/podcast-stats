import type { RSSEpisode } from '@/types'

/**
 * Re-fetch the podcast RSS feed from the client. Uses `fresh=1` + `no-store` so a manual/auto
 * refresh bypasses the route's hourly cache and actually returns newly published episodes.
 */
export async function fetchRssEpisodes(rssUrl: string): Promise<RSSEpisode[]> {
  const res = await fetch(`/api/rss?url=${encodeURIComponent(rssUrl)}&fresh=1`, {
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Ошибка загрузки RSS')
  return (data.episodes ?? []) as RSSEpisode[]
}
