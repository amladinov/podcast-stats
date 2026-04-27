import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const PODCAST_ID_PATTERN = /^[a-zA-Z0-9-]{1,64}$/

function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    return null
  }

  return { clientId, clientSecret, redirectUri }
}

function isValidPodcastId(value: string): boolean {
  return PODCAST_ID_PATTERN.test(value)
}

function extractPodcastId(stateParam: string | null): string | null {
  if (!stateParam) return null

  try {
    const decoded = JSON.parse(Buffer.from(stateParam, 'base64url').toString()) as { podcastId?: string }
    if (!decoded.podcastId || !isValidPodcastId(decoded.podcastId)) {
      return null
    }

    return decoded.podcastId
  } catch {
    return null
  }
}

function setupRedirect(req: NextRequest, podcastId: string | null, reason: string) {
  const target = podcastId
    ? `/${podcastId}/setup?youtube=error&reason=${encodeURIComponent(reason)}`
    : `/?youtube=error&reason=${encodeURIComponent(reason)}`

  return NextResponse.redirect(new URL(target, req.url))
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const stateParam = req.nextUrl.searchParams.get('state')
  const error = req.nextUrl.searchParams.get('error')
  const podcastIdFromState = extractPodcastId(stateParam)

  const cookieStore = await cookies()
  const savedState = cookieStore.get('yt_oauth_state')?.value

  // Clean up state cookie immediately
  cookieStore.delete('yt_oauth_state')

  // Handle user denial or Google error
  if (error) {
    return setupRedirect(req, podcastIdFromState, 'denied')
  }

  // Validate required params
  if (!code || !stateParam) {
    return setupRedirect(req, podcastIdFromState, 'missing_params')
  }

  // CSRF: verify state matches cookie
  if (!savedState || savedState !== stateParam) {
    return setupRedirect(req, podcastIdFromState, 'invalid_state')
  }

  // Decode state to get podcastId
  const podcastId = podcastIdFromState
  if (!podcastId) {
    return setupRedirect(req, null, 'bad_state')
  }

  // Exchange code for access_token
  const config = getGoogleOAuthConfig()
  if (!config) {
    return setupRedirect(req, podcastId, 'oauth_not_configured')
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL(`/${podcastId}/setup?youtube=error&reason=token_exchange`, req.url))
  }

  const tokenData = await tokenRes.json()
  const accessToken = tokenData.access_token

  if (!accessToken) {
    return NextResponse.redirect(new URL(`/${podcastId}/setup?youtube=error&reason=no_token`, req.url))
  }

  // Store access_token in short-lived httpOnly cookie (5 min)
  cookieStore.set('yt_access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300, // 5 minutes
    path: '/',
  })

  return NextResponse.redirect(new URL(`/${podcastId}/setup?youtube=success`, req.url))
}
