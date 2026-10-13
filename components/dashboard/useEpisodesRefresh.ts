'use client'

import { useState } from 'react'
import { fetchRssEpisodes } from '@/lib/podcastRss'
import type { RSSEpisode } from '@/types'
import type { RefreshMessage } from './useYouTubeRefresh'

interface Params {
  podcastId: string
  rssUrl: string | undefined
  refreshEpisodes: (podcastId: string, fresh: RSSEpisode[]) => { added: number; total: number }
}

/** Кнопка «Обновить выпуски»: перечитать RSS и добавить новые эпизоды в скелет. */
export function useEpisodesRefresh({ podcastId, rssUrl, refreshEpisodes }: Params) {
  const [episodesRefreshing, setEpisodesRefreshing] = useState(false)
  const [episodesMessage, setEpisodesMessage] = useState<RefreshMessage>(null)

  async function handleRefreshEpisodes() {
    if (!rssUrl || rssUrl === 'https://demo') return
    setEpisodesRefreshing(true)
    setEpisodesMessage(null)
    try {
      const fresh = await fetchRssEpisodes(rssUrl)
      if (fresh.length === 0) {
        setEpisodesMessage({ type: 'error', text: 'Лента пуста — попробуйте позже' })
        return
      }
      const { added } = refreshEpisodes(podcastId, fresh)
      setEpisodesMessage({
        type: 'success',
        text: added > 0
          ? `Добавлено выпусков: ${added}. Обновите статистику платформ, чтобы подтянуть цифры.`
          : 'Лента актуальна',
      })
    } catch (e) {
      setEpisodesMessage({ type: 'error', text: e instanceof Error ? e.message : 'Не удалось обновить ленту' })
    } finally {
      setEpisodesRefreshing(false)
    }
  }

  return { episodesRefreshing, episodesMessage, handleRefreshEpisodes }
}
