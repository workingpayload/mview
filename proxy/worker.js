// mview TMDB proxy — Cloudflare Worker
//
// Why this exists: some Indian ISPs (notably Jio) block *.themoviedb.org at the
// DNS / SNI level. This Worker lives on a *.workers.dev domain those ISPs don't
// block, and simply forwards requests to TMDB server-side. The browser talks to
// the Worker; the Worker talks to TMDB.
//
// Routing (path prefix decides the upstream):
//   /3/...   -> https://api.themoviedb.org/3/...     (JSON API, keeps ?api_key)
//   /t/p/... -> https://image.tmdb.org/t/p/...       (poster / backdrop images)
//
// Deploy:
//   1. npm i -g wrangler   (once)
//   2. cd proxy && wrangler deploy
//   3. Copy the printed https://mview-tmdb-proxy.<you>.workers.dev URL
//   4. Put it in the app's .env as VITE_TMDB_PROXY=<that url>  then rebuild.

const API_UPSTREAM = 'https://api.themoviedb.org'
const IMG_UPSTREAM = 'https://image.tmdb.org'

// Lock CORS to your app origins in production if you like; '*' is fine for a
// read-only public API key.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS })
    }
    if (request.method !== 'GET') {
      return new Response('Only GET', { status: 405, headers: CORS })
    }

    const url = new URL(request.url)
    let upstream
    if (url.pathname.startsWith('/3/')) {
      upstream = API_UPSTREAM
    } else if (url.pathname.startsWith('/t/p/')) {
      upstream = IMG_UPSTREAM
    } else {
      return new Response('Not found', { status: 404, headers: CORS })
    }

    const target = upstream + url.pathname + url.search
    const resp = await fetch(target, {
      // Forward as a fresh request; don't leak the browser's headers/cookies.
      method: 'GET',
      cf: { cacheTtl: 3600, cacheEverything: true },
    })

    // Copy the upstream response, add CORS. Images keep their content-type.
    const headers = new Headers(resp.headers)
    for (const [k, v] of Object.entries(CORS)) headers.set(k, v)
    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers,
    })
  },
}
