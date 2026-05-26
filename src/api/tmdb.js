import axios from 'axios'
import { detectRegion } from '@/lib/region'

const API_KEY = import.meta.env.VITE_TMDB_API_KEY
const BASE = 'https://api.themoviedb.org/3'
const IMG_BASE = 'https://image.tmdb.org/t/p'
const DEFAULT_REGION = detectRegion()

if (!API_KEY || API_KEY === 'your_tmdb_v3_api_key_here') {
  console.warn(
    '[mview] VITE_TMDB_API_KEY is not set. Get a v3 key at https://www.themoviedb.org/settings/api and add it to .env',
  )
}

const client = axios.create({
  baseURL: BASE,
  params: { api_key: API_KEY },
  timeout: 12000,
})

export function imgUrl(path, size = 'w342') {
  if (!path) return null
  return `${IMG_BASE}/${size}${path}`
}

let trendingCache = null
export async function getTrending(window = 'week') {
  if (trendingCache) return trendingCache
  const { data } = await client.get(`/trending/all/${window}`)
  trendingCache = (data.results ?? [])
    .filter((r) => (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path)
    .slice(0, 12)
  return trendingCache
}

export async function searchMulti(query) {
  if (!query) return []
  const { data } = await client.get('/search/multi', {
    params: { query, include_adult: false, page: 1 },
  })
  return (data.results ?? [])
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
    .filter((r) => r.poster_path || r.backdrop_path)
}

const detailsCache = new Map()
const recsCache = new Map()
const creditsCache = new Map()
const providersCache = new Map()
const discoverCache = new Map()
const keywordsCache = new Map()

function cacheKey(mediaType, id) {
  return `${mediaType}:${id}`
}

export async function getDetails(mediaType, id) {
  const k = cacheKey(mediaType, id)
  if (detailsCache.has(k)) return detailsCache.get(k)
  const { data } = await client.get(`/${mediaType}/${id}`)
  detailsCache.set(k, data)
  return data
}

export async function getRecommendations(mediaType, id) {
  const k = cacheKey(mediaType, id)
  if (recsCache.has(k)) return recsCache.get(k)
  const [{ data: rec }, { data: sim }] = await Promise.all([
    client.get(`/${mediaType}/${id}/recommendations`),
    client.get(`/${mediaType}/${id}/similar`),
  ])
  const map = new Map()
  for (const r of rec.results ?? []) map.set(r.id, r)
  for (const s of sim.results ?? []) if (!map.has(s.id)) map.set(s.id, s)
  const list = [...map.values()]
    .filter((r) => r.poster_path)
    .map((r) => ({ ...r, media_type: mediaType }))
  recsCache.set(k, list)
  return list
}

// Keywords help relevance: searching "Inception" returns Hindi *thrillers*,
// not generic top-popularity Bollywood films.
export async function getKeywords(mediaType, id) {
  const k = cacheKey(mediaType, id)
  if (keywordsCache.has(k)) return keywordsCache.get(k)
  const { data } = await client.get(`/${mediaType}/${id}/keywords`)
  // /movie returns {keywords:[]}, /tv returns {results:[]}
  const list = mediaType === 'tv' ? (data.results ?? []) : (data.keywords ?? [])
  keywordsCache.set(k, list)
  return list
}

// /discover pool used to inject regional-language content into rec graphs.
// Strategy: try keyword-augmented discover first (high relevance), then page
// 1-2 of popularity-sorted as a fallback so we always have a fuller pool to
// sample from. Returns a deduped array with keyword matches listed first.
export async function discoverByLanguage(mediaType, language, opts = {}) {
  const { genreId = null, keywordIds = [] } = opts
  if (!language || language === 'any' || language === 'en') return []
  const type = mediaType === 'tv' ? 'tv' : 'movie'
  const kwKey = keywordIds.slice(0, 3).join(',')
  const cacheK = `${type}:${language}:${genreId ?? ''}:${kwKey}`
  if (discoverCache.has(cacheK)) return discoverCache.get(cacheK)

  const baseParams = {
    with_original_language: language,
    sort_by: 'popularity.desc',
    include_adult: false,
  }
  if (genreId) baseParams.with_genres = genreId

  const calls = []
  // Keyword-augmented (relevance-first). TMDB treats '|' as OR.
  if (keywordIds.length) {
    calls.push(
      client
        .get(`/discover/${type}`, {
          params: { ...baseParams, with_keywords: keywordIds.slice(0, 3).join('|'), page: 1 },
        })
        .catch(() => null),
    )
  }
  // Popular fallback: pages 1 + 2 of plain genre+language popularity.
  for (const page of [1, 2]) {
    calls.push(client.get(`/discover/${type}`, { params: { ...baseParams, page } }).catch(() => null))
  }
  const responses = await Promise.all(calls)

  const seen = new Set()
  const out = []
  for (const resp of responses) {
    if (!resp) continue
    for (const r of resp.data?.results ?? []) {
      if (seen.has(r.id) || !r.poster_path) continue
      seen.add(r.id)
      out.push({ ...r, media_type: type })
    }
  }
  discoverCache.set(cacheK, out)
  return out
}

export async function getCredits(mediaType, id) {
  const k = cacheKey(mediaType, id)
  if (creditsCache.has(k)) return creditsCache.get(k)
  const { data } = await client.get(`/${mediaType}/${id}/credits`)
  creditsCache.set(k, data)
  return data
}

export async function getWatchProviders(mediaType, id, region = DEFAULT_REGION) {
  const k = `${cacheKey(mediaType, id)}:${region}`
  if (providersCache.has(k)) return providersCache.get(k)
  const { data } = await client.get(`/${mediaType}/${id}/watch/providers`)
  const regionData = data.results?.[region] ?? {}
  const flatrate = regionData.flatrate ?? []
  const ads = regionData.ads ?? []
  const free = regionData.free ?? []
  const link = regionData.link ?? null
  const combined = [...flatrate, ...free, ...ads]
  const dedup = []
  const seen = new Set()
  for (const p of combined) {
    if (seen.has(p.provider_id)) continue
    seen.add(p.provider_id)
    dedup.push(p)
  }
  const result = { providers: dedup, link }
  providersCache.set(k, result)
  return result
}

export function title(item) {
  return item?.title || item?.name || 'Untitled'
}

export function year(item) {
  const d = item?.release_date || item?.first_air_date
  if (!d) return null
  return d.slice(0, 4)
}

export function tmdb() {
  return client
}
