import { NextRequest, NextResponse } from 'next/server'
import { DOMParser } from '@xmldom/xmldom'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNode = any

function getFirstEl(parent: AnyNode, tag: string): AnyNode | null {
  const list = parent.getElementsByTagName(tag)
  return list && list.length > 0 ? list[0] : null
}

function getText(parent: AnyNode, tag: string): string {
  return getFirstEl(parent, tag)?.textContent?.trim() ?? ''
}

function parseDuration(raw: string): number | undefined {
  if (!raw) return undefined
  const parts = raw.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parseInt(raw, 10) || undefined
}

function toISO(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'PodcastStats/1.0' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error(`Feed returned ${res.status}`)

    const xml = await res.text()
    const doc = new DOMParser().parseFromString(xml, 'text/xml')

    const channel = getFirstEl(doc, 'channel')
    if (!channel) throw new Error('Не найден элемент channel в RSS')

    const title = getText(channel, 'title')
    const description = getText(channel, 'description')

    // Cover image: try itunes:image href, then image/url
    const itunesImageEl = getFirstEl(channel, 'itunes:image')
    const imageUrl =
      itunesImageEl?.getAttribute('href') ||
      getText(getFirstEl(channel, 'image') as AnyNode | null ?? channel, 'url') ||
      ''

    const itemEls = channel.getElementsByTagName('item')
    const episodes = Array.from({ length: itemEls.length }, (_, idx) => {
      const item = itemEls[idx] as AnyNode

      const guidEl = getFirstEl(item, 'guid')
      const guid = guidEl?.textContent?.trim() || `ep-${idx}`

      const epTitle = getText(item, 'title')
      const pubDate = toISO(getText(item, 'pubDate'))

      const durationRaw = getText(item, 'itunes:duration')
      const duration = parseDuration(durationRaw)

      const desc =
        getText(item, 'itunes:summary') ||
        getText(item, 'description')

      const epImageEl = getFirstEl(item, 'itunes:image')
      const epImage = epImageEl?.getAttribute('href') ?? ''

      return {
        guid,
        title: epTitle,
        publishDate: pubDate,
        duration,
        description: desc.slice(0, 300),
        imageUrl: epImage,
      }
    })

    return NextResponse.json({ title, description, imageUrl, episodes })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
