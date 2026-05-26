// localStorage-backed recent search history.
// Stores compact TMDB result objects so the cmdk dropdown can render them
// (poster + title + year + media_type) without re-fetching.

const KEY = 'mview:recents'
const LIMIT = 8

export function getRecents() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function pushRecent(item) {
  if (!item?.id) return
  const compact = {
    id: item.id,
    media_type: item.media_type || (item.first_air_date ? 'tv' : 'movie'),
    title: item.title || item.name || 'Untitled',
    name: item.name,
    poster_path: item.poster_path,
    release_date: item.release_date,
    first_air_date: item.first_air_date,
    vote_average: item.vote_average,
  }
  const cur = getRecents().filter((r) => !(r.id === compact.id && r.media_type === compact.media_type))
  cur.unshift(compact)
  try {
    localStorage.setItem(KEY, JSON.stringify(cur.slice(0, LIMIT)))
  } catch {}
}

export function clearRecents() {
  try {
    localStorage.removeItem(KEY)
  } catch {}
}
