// Fanart.tv image lookup. Movies are keyed by TMDB id, TV by TheTVDB id.
// Returns {poster, backdrop} with full URLs, or null on miss.
import axios from 'axios'

const API_KEY = import.meta.env.VITE_FANART_API_KEY
const BASE = 'https://webservice.fanart.tv/v3'

const cache = new Map()

export function hasFanartKey() {
  return Boolean(API_KEY)
}

export async function fanartImages(mediaType, externalId) {
  if (!API_KEY || !externalId) return null
  const k = `${mediaType}:${externalId}`
  if (cache.has(k)) return cache.get(k)
  const endpoint = mediaType === 'tv' ? 'tv' : 'movies'
  try {
    const { data } = await axios.get(`${BASE}/${endpoint}/${externalId}`, {
      params: { api_key: API_KEY },
      timeout: 8000,
    })
    // Movies use `movieposter` / `moviebackground`; TV uses `tvposter` / `showbackground`.
    const poster =
      data?.movieposter?.[0]?.url ??
      data?.tvposter?.[0]?.url ??
      null
    const backdrop =
      data?.moviebackground?.[0]?.url ??
      data?.showbackground?.[0]?.url ??
      null
    const result = poster || backdrop ? { poster, backdrop } : null
    cache.set(k, result)
    return result
  } catch {
    cache.set(k, null)
    return null
  }
}
