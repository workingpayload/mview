// mview TMDB proxy — Vercel Edge Function
//
// Why: some Indian ISPs (notably Jio) block *.themoviedb.org at the DNS/SNI
// level. This function runs on the app's own *.vercel.app domain (not blocked)
// and forwards requests to TMDB server-side. Because it's same-origin with the
// app, there's no CORS to configure.
//
// Routing (path after /api/tmdb decides the upstream):
//   /api/tmdb/3/...   -> https://api.themoviedb.org/3/...   (JSON, keeps ?api_key)
//   /api/tmdb/t/p/... -> https://image.tmdb.org/t/p/...     (posters / backdrops)
//
// Wire it up: set VITE_TMDB_PROXY=/api/tmdb in the app env (see .env.example).
// Deploys automatically with the rest of the site on `vercel deploy` / git push.

export const config = { runtime: 'edge' }

const API_UPSTREAM = 'https://api.themoviedb.org'
const IMG_UPSTREAM = 'https://image.tmdb.org'

export default async function handler(req) {
  if (req.method !== 'GET') {
    return new Response('Only GET', { status: 405 })
  }

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/api\/tmdb/, '') // e.g. /3/movie/550

  let upstream
  if (path.startsWith('/3/')) {
    upstream = API_UPSTREAM
  } else if (path.startsWith('/t/p/')) {
    upstream = IMG_UPSTREAM
  } else {
    return new Response('Not found', { status: 404 })
  }

  const target = upstream + path + url.search
  const resp = await fetch(target, { method: 'GET' })

  // Stream the upstream response straight back; cache images/JSON at the edge.
  const headers = new Headers(resp.headers)
  if (resp.ok) headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400')
  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers,
  })
}
