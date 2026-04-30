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

type ReturnTo = 'setup' | 'dashboard'

function isValidReturnTo(value: unknown): value is ReturnTo {
  return value === 'setup' || value === 'dashboard'
}

function extractState(stateParam: string | null): { podcastId: string | null; returnTo: ReturnTo } {
  if (!stateParam) return { podcastId: null, returnTo: 'setup' }

  try {
    const decoded = JSON.parse(Buffer.from(stateParam, 'base64url').toString()) as {
      podcastId?: string
      returnTo?: unknown
    }
    const podcastId = decoded.podcastId && isValidPodcastId(decoded.podcastId) ? decoded.podcastId : null
    const returnTo: ReturnTo = isValidReturnTo(decoded.returnTo) ? decoded.returnTo : 'setup'
    return { podcastId, returnTo }
  } catch {
    return { podcastId: null, returnTo: 'setup' }
  }
}

function buildPath(podcastId: string, returnTo: ReturnTo, query: string): string {
  return `/${podcastId}/${returnTo}?${query}`
}

function errorRedirect(req: NextRequest, podcastId: string | null, returnTo: ReturnTo, reason: string) {
  const query = `youtube=error&reason=${encodeURIComponent(reason)}`
  const target = podcastId ? buildPath(podcastId, returnTo, query) : `/?${query}`
  return NextResponse.redirect(new URL(target, req.url))
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const stateParam = req.nextUrl.searchParams.get('state')
  const error = req.nextUrl.searchParams.get('error')
  const { podcastId: podcastIdFromState, returnTo } = extractState(stateParam)

  const cookieStore = await cookies()
  const savedState = cookieStore.get('yt_oauth_state')?.value

  // Clean up state cookie immediately
  cookieStore.delete('yt_oauth_state')

  // Handle user denial or Google error
  if (error) {
    return errorRedirect(req, podcastIdFromState, returnTo, 'denied')
  }

  // Validate required params
  if (!code || !stateParam) {
    return errorRedirect(req, podcastIdFromState, returnTo, 'missing_params')
  }

  // CSRF: verify state matches cookie
  if (!savedState || savedState !== stateParam) {
    return errorRedirect(req, podcastIdFromState, returnTo, 'invalid_state')
  }

  // Decode state to get podcastId
  const podcastId = podcastIdFromState
  if (!podcastId) {
    return errorRedirect(req, null, returnTo, 'bad_state')
  }

  // Exchange code for access_token
  const config = getGoogleOAuthConfig()
  if (!config) {
    return errorRedirect(req, podcastId, returnTo, 'oauth_not_configured')
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
    return errorRedirect(req, podcastId, returnTo, 'token_exchange')
  }

  const tokenData = await tokenRes.json()
  const accessToken = tokenData.access_token

  if (!accessToken) {
    return errorRedirect(req, podcastId, returnTo, 'no_token')
  }

  // Store access_token in short-lived httpOnly cookie (5 min)
  cookieStore.set('yt_access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300, // 5 minutes
    path: '/',
  })

  return NextResponse.redirect(new URL(buildPath(podcastId, returnTo, 'youtube=success'), req.url))
}
