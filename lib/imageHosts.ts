const ALLOWED_REMOTE_IMAGE_HOSTS = [
  'cdn.mave.digital',
  'images.megaphone.fm',
  'megaphone.imgix.net',
  'image.simplecastcdn.com',
  'images.squarespace-cdn.com',
  'static.libsyn.com',
  'assets.libsyn.com',
  'pbcdn1.podbean.com',
  'mcdn.podbean.com',
  'is1-ssl.mzstatic.com',
  'images.blubrry.com',
  'media.rss.com',
  'storage.yandexcloud.net',
] as const

export const NEXT_IMAGE_REMOTE_HOSTS = [...ALLOWED_REMOTE_IMAGE_HOSTS]

export function normalizePodcastImageUrl(src: string, baseUrl?: string): string {
  if (!src) return ''

  const trimmed = src.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('/')) return trimmed

  try {
    const hasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)
    const withScheme = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed
    const resolved = hasScheme || trimmed.startsWith('//')
      ? new URL(withScheme)
      : baseUrl
        ? new URL(trimmed, baseUrl)
        : new URL(trimmed)

    if (resolved.protocol === 'http:') {
      resolved.protocol = 'https:'
    }

    return resolved.toString()
  } catch {
    return trimmed
  }
}

export function canUseNextImage(src: string): boolean {
  const normalized = normalizePodcastImageUrl(src)
  if (!normalized) return false
  if (normalized.startsWith('/')) return true

  try {
    const url = new URL(normalized)
    return (
      url.protocol === 'https:' &&
      ALLOWED_REMOTE_IMAGE_HOSTS.includes(url.hostname as typeof ALLOWED_REMOTE_IMAGE_HOSTS[number])
    )
  } catch {
    return false
  }
}
