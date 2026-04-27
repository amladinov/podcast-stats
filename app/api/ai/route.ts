import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { NormalizedEpisode } from '@/types'

const client = new Anthropic()
const AI_INSIGHTS_ENABLED = process.env.AI_INSIGHTS_ENABLED === 'true'
const MAX_BODY_BYTES = 64 * 1024
const MAX_EPISODES = 500
const MAX_TITLE_LENGTH = 200
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 5
const rateLimitStore = new Map<string, number[]>()

interface AIRequestPayload {
  episodes: NormalizedEpisode[]
  podcastTitle: string
}

function getClientKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown'
  }

  return req.headers.get('x-real-ip') || 'unknown'
}

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const recent = (rateLimitStore.get(key) ?? []).filter(ts => now - ts < RATE_LIMIT_WINDOW_MS)
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitStore.set(key, recent)
    return false
  }

  recent.push(now)
  rateLimitStore.set(key, recent)
  return true
}

function safeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0
}

function safeString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function sanitizeEpisodes(input: unknown): NormalizedEpisode[] {
  if (!Array.isArray(input)) {
    throw new Error('Некорректный формат episodes')
  }

  if (input.length > MAX_EPISODES) {
    throw new Error(`Слишком много эпизодов: максимум ${MAX_EPISODES}`)
  }

  return input.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Некорректный эпизод в позиции ${index}`)
    }

    const episode = item as Partial<NormalizedEpisode>
    const title = safeString(episode.title, MAX_TITLE_LENGTH)
    const publishDate = safeString(episode.publishDate, 20)
    const plays = episode.plays && typeof episode.plays === 'object' ? episode.plays : undefined

    return {
      id: safeString(episode.id, 120) || `ep-${index}`,
      title: title || `Эпизод ${index + 1}`,
      publishDate,
      plays: {
        mave: safeNumber(plays?.mave),
        yandex: safeNumber(plays?.yandex),
        spotify: safeNumber(plays?.spotify),
        vk: safeNumber(plays?.vk),
        youtube: safeNumber(plays?.youtube),
        total: safeNumber(plays?.total),
      },
      timeline: [],
      maveVideoViews: safeNumber(episode.maveVideoViews) || undefined,
      yandexStarts: safeNumber(episode.yandexStarts) || undefined,
      yandexListeners: safeNumber(episode.yandexListeners) || undefined,
      yandexHours: safeNumber(episode.yandexHours) || undefined,
      yandexCompletionRate: safeNumber(episode.yandexCompletionRate) || undefined,
      spotifyStreams: safeNumber(episode.spotifyStreams) || undefined,
      spotifyAudience: safeNumber(episode.spotifyAudience) || undefined,
      youtubeViews: safeNumber(episode.youtubeViews) || undefined,
      youtubeLikes: safeNumber(episode.youtubeLikes) || undefined,
      youtubeComments: safeNumber(episode.youtubeComments) || undefined,
    }
  }).map(ep => ({
    ...ep,
    plays: {
      ...ep.plays,
      total: ep.plays.mave + ep.plays.yandex + ep.plays.spotify + ep.plays.vk + ep.plays.youtube,
    },
  }))
}

async function readPayload(req: NextRequest): Promise<AIRequestPayload> {
  const raw = await req.text()
  if (raw.length > MAX_BODY_BYTES) {
    throw new Error('Слишком большой запрос')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Некорректный JSON')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Некорректное тело запроса')
  }

  const body = parsed as { episodes?: unknown; podcastTitle?: unknown }
  const podcastTitle = safeString(body.podcastTitle, MAX_TITLE_LENGTH)
  if (!podcastTitle) {
    throw new Error('podcastTitle обязателен')
  }

  return {
    podcastTitle,
    episodes: sanitizeEpisodes(body.episodes),
  }
}

export async function POST(req: NextRequest) {
  if (!AI_INSIGHTS_ENABLED) {
    return NextResponse.json(
      { error: 'AI-инсайты временно отключены в публичной версии сервиса' },
      { status: 503 }
    )
  }

  const clientKey = getClientKey(req)
  if (!checkRateLimit(clientKey)) {
    return NextResponse.json({ error: 'Слишком много запросов, попробуйте позже' }, { status: 429 })
  }

  try {
    const { episodes, podcastTitle } = await readPayload(req)

    const top5 = [...episodes]
      .sort((a, b) => b.plays.total - a.plays.total)
      .slice(0, 5)

    const bottom3 = [...episodes]
      .filter(e => e.plays.total > 0)
      .sort((a, b) => a.plays.total - b.plays.total)
      .slice(0, 3)

    const totalPlays = episodes.reduce((s, e) => s + e.plays.total, 0)
    const mavePlays = episodes.reduce((s, e) => s + e.plays.mave, 0)
    const yandexPlays = episodes.reduce((s, e) => s + e.plays.yandex, 0)
    const spotifyPlays = episodes.reduce((s, e) => s + e.plays.spotify, 0)
    const vkPlays = episodes.reduce((s, e) => s + e.plays.vk, 0)
    const youtubePlays = episodes.reduce((s, e) => s + e.plays.youtube, 0)

    const prompt = `Ты аналитик подкастов. Проанализируй статистику подкаста «${podcastTitle}» и дай краткие практические выводы на русском языке.

Общая статистика:
- Всего прослушиваний/просмотров: ${totalPlays.toLocaleString('ru')}
- По платформам: Mave ${mavePlays.toLocaleString('ru')}, Яндекс ${yandexPlays.toLocaleString('ru')}, Spotify ${spotifyPlays.toLocaleString('ru')}, VK ${vkPlays.toLocaleString('ru')}, YouTube ${youtubePlays.toLocaleString('ru')}
- Всего эпизодов: ${episodes.length}
- Среднее на эпизод: ${episodes.length > 0 ? Math.round(totalPlays / episodes.length).toLocaleString('ru') : '—'}

Топ-5 эпизодов:
${top5.map((e, i) => `${i + 1}. «${e.title}» — ${e.plays.total.toLocaleString('ru')} прослушиваний`).join('\n')}

Аутсайдеры (3 эпизода с наименьшим числом прослушиваний):
${bottom3.map((e, i) => `${i + 1}. «${e.title}» — ${e.plays.total.toLocaleString('ru')} прослушиваний`).join('\n')}

Дай 4-5 конкретных инсайта. Формат: каждый инсайт с заголовком (жирный текст) и 1-2 предложения объяснения. Будь конкретным — упоминай реальные цифры и названия эпизодов.`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const firstBlock = message.content[0]
    const text = firstBlock?.type === 'text' ? firstBlock.text : ''
    return NextResponse.json({ insights: text })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = (
      message.includes('Некоррект') ||
      message.includes('Слишком большой') ||
      message.includes('Слишком много эпизодов') ||
      message.includes('обязателен')
    ) ? 400 : 500

    return NextResponse.json(
      { error: status === 400 ? message : 'Не удалось получить AI-инсайты' },
      { status }
    )
  }
}
