// Trakt API client — used only when TMDB is unreachable. Trakt uses slugs
// or numeric ids; responses include cross-references (`ids.tmdb`, `ids.imdb`,
// `ids.tvdb`) which we lean on to bridge to Fanart.tv and OMDb.
import axios from 'axios'

const CLIENT_ID = import.meta.env.VITE_TRAKT_CLIENT_ID
const BASE = 'https://api.trakt.tv'

const client = axios.create({
  baseURL: BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'trakt-api-version': '2',
    'trakt-api-key': CLIENT_ID ?? '',
  },
})

export function hasTraktKey() {
  return Boolean(CLIENT_ID)
}

const traktTypeFor = (mediaType) => (mediaType === 'tv' ? 'shows' : 'movies')

export async function traktSearch(query) {
  if (!CLIENT_ID || !query) return []
  const { data } = await client.get('/search/movie,show', {
    params: { query, limit: 10, extended: 'full' },
  })
  return data ?? []
}

const traktIdByExternal = new Map()
// Resolve a Trakt slug/id from an external id (TMDB).
export async function traktIdFromTmdb(mediaType, tmdbId) {
  if (!CLIENT_ID || !tmdbId) return null
  const k = `${mediaType}:${tmdbId}`
  if (traktIdByExternal.has(k)) return traktIdByExternal.get(k)
  try {
    const { data } = await client.get(`/search/tmdb/${tmdbId}`, {
      params: { type: mediaType === 'tv' ? 'show' : 'movie' },
    })
    const hit = Array.isArray(data) ? data[0] : null
    const t = hit?.[hit?.type]
    const slug = t?.ids?.slug ?? t?.ids?.trakt ?? null
    traktIdByExternal.set(k, slug)
    return slug
  } catch {
    traktIdByExternal.set(k, null)
    return null
  }
}

export async function traktDetails(mediaType, traktIdOrSlug) {
  if (!CLIENT_ID || !traktIdOrSlug) return null
  const { data } = await client.get(`/${traktTypeFor(mediaType)}/${traktIdOrSlug}`, {
    params: { extended: 'full' },
  })
  return data
}

export async function traktRelated(mediaType, traktIdOrSlug) {
  if (!CLIENT_ID || !traktIdOrSlug) return []
  try {
    const { data } = await client.get(
      `/${traktTypeFor(mediaType)}/${traktIdOrSlug}/related`,
      { params: { limit: 20, extended: 'full' } },
    )
    return data ?? []
  } catch {
    return []
  }
}

export async function traktPeople(mediaType, traktIdOrSlug) {
  if (!CLIENT_ID || !traktIdOrSlug) return null
  try {
    const { data } = await client.get(
      `/${traktTypeFor(mediaType)}/${traktIdOrSlug}/people`,
    )
    return data
  } catch {
    return null
  }
}

export async function traktTrending() {
  if (!CLIENT_ID) return []
  try {
    const [movies, shows] = await Promise.all([
      client.get('/movies/trending', { params: { limit: 8, extended: 'full' } }),
      client.get('/shows/trending', { params: { limit: 8, extended: 'full' } }),
    ])
    return [
      ...(movies.data ?? []).map((m) => ({ media_type: 'movie', wrap: m.movie })),
      ...(shows.data ?? []).map((s) => ({ media_type: 'tv', wrap: s.show })),
    ]
  } catch {
    return []
  }
}
