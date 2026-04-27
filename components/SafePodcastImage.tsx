'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { canUseNextImage, normalizePodcastImageUrl } from '@/lib/imageHosts'

interface SafePodcastImageProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
}

export function SafePodcastImage({ src, alt, width, height, className }: SafePodcastImageProps) {
  const [failed, setFailed] = useState(false)
  const normalizedSrc = useMemo(() => normalizePodcastImageUrl(src), [src])

  if (failed || !normalizedSrc) {
    return (
      <div
        aria-hidden="true"
        className={[className, 'bg-[#f2f2f7]'].filter(Boolean).join(' ')}
        style={{ width, height }}
      />
    )
  }

  if (canUseNextImage(normalizedSrc)) {
    return (
      <Image
        src={normalizedSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={normalizedSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
