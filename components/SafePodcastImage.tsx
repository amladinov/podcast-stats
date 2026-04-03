'use client'

import Image from 'next/image'
import { canUseNextImage } from '@/lib/imageHosts'

interface SafePodcastImageProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
}

export function SafePodcastImage({ src, alt, width, height, className }: SafePodcastImageProps) {
  if (canUseNextImage(src)) {
    return <Image src={src} alt={alt} width={width} height={height} className={className} />
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  )
}
