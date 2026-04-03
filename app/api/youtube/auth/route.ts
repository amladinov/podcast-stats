import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    return null
  }

  return { clientId, clientSecret, redirectUri }
}

export async function GET(req: NextRequest) {
  const podcastId = req.nextUrl.searchParams.get('podcastId')

  if (!podcastId) {
    return NextResponse.json({ error: 'podcastId is required' }, { status: 400 })
  }

  const config = getGoogleOAuthConfig()

  if (!config) {
    return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 })
  }

  // Create state with podcastId + nonce for CSRF protection
  const nonce = crypto.randomUUID()
  const state = JSON.stringify({ podcastId, nonce })
  const stateB64 = Buffer.from(state).toString('base64url')

  // Store state in httpOnly cookie for verification in callback
  const cookieStore = await cookies()
  cookieStore.set('yt_oauth_state', stateB64, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/youtube.readonly',
    access_type: 'online',
    state: stateB64,
    prompt: 'consent',
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
