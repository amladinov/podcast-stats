import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { NormalizedEpisode } from '@/types'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { episodes, podcastTitle } = await req.json() as {
      episodes: NormalizedEpisode[]
      podcastTitle: string
    }

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

    const prompt = `Ты аналитик подкастов. Проанализируй статистику подкаста «${podcastTitle}» и дай краткие практические выводы на русском языке.

Общая статистика:
- Всего прослушиваний: ${totalPlays.toLocaleString('ru')}
- По платформам: Mave ${mavePlays.toLocaleString('ru')}, Яндекс ${yandexPlays.toLocaleString('ru')}, Spotify ${spotifyPlays.toLocaleString('ru')}, VK ${vkPlays.toLocaleString('ru')}
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

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ insights: text })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
