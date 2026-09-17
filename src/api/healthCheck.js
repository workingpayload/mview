// TMDB ISP-block detection.
//
// Some Indian ISPs (notably Jio) block api.themoviedb.org at the DNS / TLS
// level. We can't catch that with axios's error handling reliably because the
// failure looks like a generic network error. So we ping a lightweight
// endpoint at app start with a short timeout, and stash the result in
// localStorage so subsequent loads don't repeat the check.
//
// Critically: a 401/403 means the request reached TMDB but the key is wrong
// — that's NOT a block, just a misconfig. Only network-level failures
// (timeout, DNS, connection reset, opaque CORS error) set the blocked flag.

const KEY = 'mview:tmdbBlocked'
const TIMESTAMP_KEY = 'mview:tmdbBlockedAt'
// Re-check after 24h so a transient outage doesn't permanently switch users
// onto the fallback path.
const RECHECK_AFTER_MS = 24 * 60 * 60 * 1000

export function isBlocked() {
  try {
    const v = localStorage.getItem(KEY)
    if (v !== 'true') return false
    const ts = Number(localStorage.getItem(TIMESTAMP_KEY) ?? 0)
    if (Date.now() - ts > RECHECK_AFTER_MS) return false
    return true
  } catch {
    return false
  }
}

export function setBlocked(blocked) {
  try {
    if (blocked) {
      localStorage.setItem(KEY, 'true')
      localStorage.setItem(TIMESTAMP_KEY, String(Date.now()))
    } else {
      localStorage.removeItem(KEY)
      localStorage.removeItem(TIMESTAMP_KEY)
    }
  } catch {}
}

let healthCheckInflight = null

export function runHealthCheck() {
  if (healthCheckInflight) return healthCheckInflight
  healthCheckInflight = doHealthCheck().finally(() => {
    healthCheckInflight = null
  })
  return healthCheckInflight
}

async function doHealthCheck() {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY
  if (!apiKey || apiKey === 'your_tmdb_v3_api_key_here') return
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 4500)
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/configuration?api_key=${encodeURIComponent(apiKey)}`,
      { signal: ctrl.signal, cache: 'no-store' },
    )
    clearTimeout(timer)
    // 2xx = reachable. 401/403 = reachable but auth issue (not blocked).
    if (res.ok || res.status === 401 || res.status === 403) {
      setBlocked(false)
      return false
    }
    // Other non-2xx (5xx, 404 etc.) — treat as a transient TMDB issue, not
    // an ISP block. Don't switch.
    setBlocked(false)
    return false
  } catch (err) {
    clearTimeout(timer)
    // AbortError / TypeError / network failure → almost certainly blocked.
    setBlocked(true)
    return true
  }
}
