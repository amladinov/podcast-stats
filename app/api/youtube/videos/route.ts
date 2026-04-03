import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

interface YouTubeVideo {
  title: string
  videoId: string
  publishDate: string
  views: number
  likes: number
  comments: number
}

const YT_API = 'https://www.googleapis.com/youtube/v3'

async function ytFetch(endpoint: string, params: Record<string, string>, token: string) {
  const url = new URL(`${YT_API}/${endpoint}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`YouTube API ${endpoint} failed (${res.status}): ${text}`)
  }

  return res.json()
}

export async function POST() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('yt_access_token')?.value

  // Clean up token cookie immediately after reading
  cookieStore.delete('yt_access_token')

  if (!accessToken) {
    return NextResponse.json(
      { error: 'No YouTube access token. Please re-authenticate.' },
      { status: 401 }
    )
  }

  try {
    // 1. Get the user's channel and uploads playlist
    const channelData = await ytFetch('channels', {
      mine: 'true',
      part: 'contentDetails',
    }, accessToken)

    const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
    if (!uploadsPlaylistId) {
      return NextResponse.json({ error: 'No channel found for this account' }, { status: 404 })
    }

    // 2. Get all video IDs from uploads playlist (paginate)
    const allVideoIds: string[] = []
    const videoSnippets: Map<string, { title: string; publishDate: string }> = new Map()
    let pageToken: string | undefined

    do {
      const params: Record<string, string> = {
        playlistId: uploadsPlaylistId,
        part: 'snippet,contentDetails',
        maxResults: '50',
      }
      if (pageToken) params.pageToken = pageToken

      const playlistData = await ytFetch('playlistItems', params, accessToken)

      for (const item of playlistData.items || []) {
        const videoId = item.contentDetails?.videoId
        if (!videoId) continue

        allVideoIds.push(videoId)
        videoSnippets.set(videoId, {
          title: item.snippet?.title || '',
          publishDate: (item.snippet?.publishedAt || '').slice(0, 10), // YYYY-MM-DD
        })
      }

      pageToken = playlistData.nextPageToken
    } while (pageToken)

    if (allVideoIds.length === 0) {
      return NextResponse.json({ videos: [] })
    }

    // 3. Get statistics for all videos (batch by 50)
    const videos: YouTubeVideo[] = []

    for (let i = 0; i < allVideoIds.length; i += 50) {
      const batch = allVideoIds.slice(i, i + 50)

      const statsData = await ytFetch('videos', {
        id: batch.join(','),
        part: 'statistics,status',
      }, accessToken)

      for (const item of statsData.items || []) {
        // Filter out non-public videos
        if (item.status?.privacyStatus !== 'public') continue

        const stats = item.statistics || {}
        const snippet = videoSnippets.get(item.id)

        if (!snippet) continue

        videos.push({
          title: snippet.title,
          videoId: item.id,
          publishDate: snippet.publishDate,
          views: parseInt(stats.viewCount || '0', 10),
          likes: parseInt(stats.likeCount || '0', 10),
          comments: parseInt(stats.commentCount || '0', 10),
        })
      }
    }

    return NextResponse.json({ videos })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
