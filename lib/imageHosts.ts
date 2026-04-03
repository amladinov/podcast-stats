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

export function canUseNextImage(src: string): boolean {
  if (!src) return false
  if (src.startsWith('/')) return true

  try {
    const url = new URL(src)
    return (
      url.protocol === 'https:' &&
      ALLOWED_REMOTE_IMAGE_HOSTS.includes(url.hostname as typeof ALLOWED_REMOTE_IMAGE_HOSTS[number])
    )
  } catch {
    return false
  }
}
