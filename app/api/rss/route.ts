import { NextRequest, NextResponse } from 'next/server'
import dns from 'node:dns/promises'
import net from 'node:net'
import { DOMParser } from '@xmldom/xmldom'
import { normalizePodcastImageUrl } from '@/lib/imageHosts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNode = any

const FETCH_TIMEOUT_MS = 8_000
// Keep RSS size bounded for DoS safety, but allow large long-running feeds.
const MAX_XML_BYTES = 12 * 1024 * 1024
const MAX_REDIRECTS = 3

function parseAndValidateUrl(raw: string): URL {
  let url: URL

  try {
    url = new URL(raw)
  } catch {
    throw new Error('Некорректный URL RSS')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Поддерживаются только http/https RSS-ссылки')
  }

  if (url.username || url.password) {
    throw new Error('RSS-ссылка не должна содержать логин или пароль')
  }

  if (!url.hostname) {
    throw new Error('У RSS-ссылки должен быть валидный хост')
  }

  return url
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(Number.isNaN)) return true

  if (parts[0] === 10) return true
  if (parts[0] === 127) return true
  if (parts[0] === 169 && parts[1] === 254) return true
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
  if (parts[0] === 192 && parts[1] === 168) return true
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true
  if (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) return true
  if (parts[0] === 192 && parts[1] === 0 && parts[2] === 0) return true
  if (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) return true
  if (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) return true
  if (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) return true
  if (parts[0] === 0) return true
  if (parts[0] >= 224) return true

  return false
}

function expandIPv6(input: string): string[] | null {
  const [headRaw, tailRaw] = input.toLowerCase().split('::')
  if (input.split('::').length > 2) return null

  const head = headRaw ? headRaw.split(':').filter(Boolean) : []
  const tail = tailRaw ? tailRaw.split(':').filter(Boolean) : []

  if (tail.length > 0) {
    const last = tail[tail.length - 1]
    if (last.includes('.')) {
      const mapped = last.split('.').map(Number)
      if (mapped.length !== 4 || mapped.some(Number.isNaN)) return null
      tail.splice(
        tail.length - 1,
        1,
        ((mapped[0] << 8) | mapped[1]).toString(16),
        ((mapped[2] << 8) | mapped[3]).toString(16)
      )
    }
  }

  if (!input.includes('::')) {
    const full = input.split(':')
    return full.length === 8 ? full : null
  }

  const missing = 8 - (head.length + tail.length)
  if (missing < 0) return null

  return [...head, ...Array.from({ length: missing }, () => '0'), ...tail]
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase()
  if (normalized === '::') return true
  if (normalized === '::1') return true
  if (normalized.startsWith('fe80:')) return true
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true

  const expanded = expandIPv6(normalized)
  if (!expanded) return true

  if (expanded[0] === '2001' && expanded[1] === 'db8') return true

  if (expanded.slice(0, 5).every(part => part === '0') && expanded[5] === 'ffff') {
    const ipv4Hex = expanded.slice(6)
    const octets = ipv4Hex.flatMap(part => {
      const num = parseInt(part, 16)
      return [(num >> 8) & 255, num & 255]
    })

    return isPrivateIPv4(octets.join('.'))
  }

  return false
}

function isPrivateAddress(ip: string): boolean {
  const version = net.isIP(ip)
  if (version === 4) return isPrivateIPv4(ip)
  if (version === 6) return isPrivateIPv6(ip)
  return true
}

async function assertPublicHostname(hostname: string) {
  const lower = hostname.toLowerCase()

  if (lower === 'localhost' || lower.endsWith('.localhost') || lower.endsWith('.local')) {
    throw new Error('Локальные адреса запрещены')
  }

  const literalVersion = net.isIP(hostname)
  if (literalVersion !== 0) {
    if (isPrivateAddress(hostname)) {
      throw new Error('Приватные IP-адреса запрещены')
    }
    return
  }

  const records = await dns.lookup(hostname, { all: true, verbatim: true })
  if (records.length === 0) {
    throw new Error('Не удалось разрешить адрес RSS-хоста')
  }

  if (records.some(record => isPrivateAddress(record.address))) {
    throw new Error('RSS-хост указывает на приватный адрес и запрещён')
  }
}

async function readTextWithLimit(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) {
    throw new Error('Пустой ответ RSS')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let received = 0
  let text = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue

    received += value.byteLength
    if (received > maxBytes) {
      throw new Error('RSS-файл слишком большой')
    }

    text += decoder.decode(value, { stream: true })
  }

  text += decoder.decode()
  return text
}

async function fetchFeed(url: URL, redirectCount = 0): Promise<Response> {
  if (redirectCount > MAX_REDIRECTS) {
    throw new Error('Слишком много редиректов при загрузке RSS')
  }

  await assertPublicHostname(url.hostname)

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'PodcastStats/1.0',
      'Accept': 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.1',
    },
    redirect: 'manual',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    next: { revalidate: 3600 },
  })

  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location')
    if (!location) {
      throw new Error('RSS-редирект без location header')
    }

    const nextUrl = parseAndValidateUrl(new URL(location, url).toString())
    return fetchFeed(nextUrl, redirectCount + 1)
  }

  return res
}

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
  const rawUrl = req.nextUrl.searchParams.get('url')
  if (!rawUrl) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  try {
    const url = parseAndValidateUrl(rawUrl)
    const res = await fetchFeed(url)
    if (!res.ok) throw new Error(`Feed returned ${res.status}`)

    const contentType = res.headers.get('content-type')?.toLowerCase() ?? ''
    if (
      contentType &&
      !contentType.includes('xml') &&
      !contentType.includes('rss') &&
      !contentType.includes('atom')
    ) {
      throw new Error('Ответ не похож на RSS/XML')
    }

    const xml = await readTextWithLimit(res, MAX_XML_BYTES)
    const doc = new DOMParser().parseFromString(xml, 'text/xml')

    const channel = getFirstEl(doc, 'channel')
    if (!channel) throw new Error('Не найден элемент channel в RSS')

    const title = getText(channel, 'title')
    const description = getText(channel, 'description')

    // Cover image: try itunes:image href, then image/url
    const itunesImageEl = getFirstEl(channel, 'itunes:image')
    const imageUrl = normalizePodcastImageUrl(
      itunesImageEl?.getAttribute('href') ||
        getText(getFirstEl(channel, 'image') as AnyNode | null ?? channel, 'url') ||
        '',
      url.toString()
    )

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
      const epImage = normalizePodcastImageUrl(epImageEl?.getAttribute('href') ?? '', url.toString())

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
