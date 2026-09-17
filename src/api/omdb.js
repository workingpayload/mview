// OMDb as a secondary poster source. Keyed by IMDb id.
import axios from 'axios'

const API_KEY = import.meta.env.VITE_OMDB_API_KEY
const BASE = 'https://www.omdbapi.com/'

const cache = new Map()

export function hasOmdbKey() {
  return Boolean(API_KEY)
}

export async function omdbPoster(imdbId) {
  if (!API_KEY || !imdbId) return null
  if (cache.has(imdbId)) return cache.get(imdbId)
  try {
    const { data } = await axios.get(BASE, {
      params: { i: imdbId, apikey: API_KEY },
      timeout: 6000,
    })
    const poster = data?.Poster && data.Poster !== 'N/A' ? data.Poster : null
    cache.set(imdbId, poster)
    return poster
  } catch {
    cache.set(imdbId, null)
    return null
  }
}
