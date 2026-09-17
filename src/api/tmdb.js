import axios from 'axios'
import { detectRegion } from '@/lib/region'
import { isBlocked, setBlocked } from './healthCheck'
import * as fallback from './fallback'

// A missing `err.response` means no HTTP reply ever came back: DNS failure,
// TLS reset, timeout, opaque CORS — the exact signature of an ISP block.
// A 401/403 HAS a response, so it's correctly treated as reachable-but-misconfig.
function isNetworkError(err) {
  return !err?.response
}

// Run the TMDB path; if it dies at the network level, flip the blocked flag
// and self-heal. Order of escape hatches when blocked:
//   1. proxy (if VITE_TMDB_PROXY set) — full TMDB quality via allowed domain
//   2. fallbackFn — Trakt + Fanart + OMDb (last resort, needs its own keys)
// Also fixes the first-load race: the interceptor reroutes to the proxy the
// moment isBlocked() flips, and a network failure retries through it immediately.
async function guarded(tmdbFn, fallbackFn) {
  // Already known blocked and no proxy to save us → straight to Trakt fallback.
  if (isBlocked() && !hasProxy) return fallbackFn()
  try {
    return await tmdbFn()
  } catch (err) {
    if (!isNetworkError(err)) throw err
    setBlocked(true)
    if (hasProxy) {
      // isBlocked() is now true, so the request interceptor rewrites the base
      // URL to the proxy. Retry the exact same call through it.
      try {
        return await tmdbFn()
      } catch (proxyErr) {
        if (isNetworkError(proxyErr)) return fallbackFn()
        throw proxyErr
      }
    }
    return fallbackFn()
  }
}

const API_KEY = import.meta.env.VITE_TMDB_API_KEY
const BASE = 'https://api.themoviedb.org/3'
const IMG_BASE = 'https://image.tmdb.org/t/p'
const DEFAULT_REGION = detectRegion()

// Optional Cloudflare Worker (or any reverse proxy) on a domain the user's ISP
// doesn't block. When TMDB is detected as blocked, API + image traffic reroutes
// through here — full TMDB quality, no ISP-block. See proxy/worker.js.
const PROXY = (import.meta.env.VITE_TMDB_PROXY ?? '').replace(/\/$/, '')
const hasProxy = Boolean(PROXY)

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

// When blocked + a proxy is configured, reroute every request through it. The
// proxy forwards /3/* to api.themoviedb.org, so the base becomes `${PROXY}/3`.
client.interceptors.request.use((config) => {
  if (hasProxy && isBlocked()) config.baseURL = `${PROXY}/3`
  return config
})

// imgUrl handles: full URLs (Fanart/OMDb fallback), proxied TMDB images when
// blocked, and plain TMDB CDN paths otherwise.
export function imgUrl(path, size = 'w342') {
  if (!path) return null
  if (typeof path === 'string' && /^https?:\/\//.test(path)) return path
  if (hasProxy && isBlocked()) return `${PROXY}/t/p/${size}${path}`
  return `${IMG_BASE}/${size}${path}`
}

let trendingCache = null
export function getTrending(window = 'week') {
  return guarded(
    async () => {
      if (trendingCache) return trendingCache
      const { data } = await client.get(`/trending/all/${window}`)
      trendingCache = (data.results ?? [])
        .filter((r) => (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path)
        .slice(0, 12)
      return trendingCache
    },
    () => fallback.getTrending(),
  )
}

export function searchMulti(query) {
  if (!query) return Promise.resolve([])
  return guarded(
    async () => {
      const { data } = await client.get('/search/multi', {
        params: { query, include_adult: false, page: 1 },
      })
      return (data.results ?? [])
        .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
        .filter((r) => r.poster_path || r.backdrop_path)
    },
    () => fallback.searchMulti(query),
  )
}

const detailsCache = new Map()
const recsCache = new Map()
const creditsCache = new Map()
const providersCache = new Map()
const discoverCache = new Map()
const keywordsCache = new Map()
const keywordMoviesCache = new Map()
const subjectCache = new Map()
const tvSubjectCache = new Map()

function cacheKey(mediaType, id) {
  return `${mediaType}:${id}`
}

export function getDetails(mediaType, id) {
  return guarded(
    async () => {
      const k = cacheKey(mediaType, id)
      if (detailsCache.has(k)) return detailsCache.get(k)
      const { data } = await client.get(`/${mediaType}/${id}`)
      detailsCache.set(k, data)
      return data
    },
    () => fallback.getDetails(mediaType, id),
  )
}

export function getRecommendations(mediaType, id) {
  return guarded(
    async () => {
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
    },
    () => fallback.getRecommendations(mediaType, id),
  )
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

// TMDB-curated list of movies tagged with a given keyword. This is far more
// precise than /discover's `with_keywords` text-matching: TMDB editors actually
// curated these lists, so a film appearing in /keyword/3577/movies is genuinely
// about dreams, not just text-matching.
// Movie-only endpoint; TV has no equivalent.
export async function getMoviesByKeyword(keywordId, page = 1) {
  const k = `${keywordId}:${page}`
  if (keywordMoviesCache.has(k)) return keywordMoviesCache.get(k)
  try {
    const { data } = await client.get(`/keyword/${keywordId}/movies`, { params: { page } })
    const out = (data.results ?? []).filter((r) => r.poster_path)
    keywordMoviesCache.set(k, out)
    return out
  } catch {
    keywordMoviesCache.set(k, [])
    return []
  }
}

// Score-based subject matcher. For each of the center's top keywords we fetch
// its curated movie list, then score every candidate by how many of those
// lists it appears in. A film inheriting 4-of-5 keywords is way more relevant
// than one popular Bollywood title that just shares a genre.
//
// `originalLanguage` and `originCountry` are OR-filtered — a film passes if
// either matches the user's region hints. That lets Tamil/Telugu/etc. Indian
// films through alongside Hindi when region=IN.
//
// Returns array sorted by score desc, vote_count desc as tiebreaker (never
// vote_average — user explicitly asked not to recommend by rating).
export async function discoverBySubject({
  keywordIds = [],
  originalLanguage = null,
  originCountry = null,
  mediaType = 'movie',
}) {
  if (mediaType !== 'movie' || !keywordIds.length) return []
  const top = keywordIds.slice(0, 5)
  const cacheK = `${top.join(',')}:${originalLanguage ?? ''}:${originCountry ?? ''}`
  if (subjectCache.has(cacheK)) return subjectCache.get(cacheK)

  const lists = await Promise.all(top.map((id) => getMoviesByKeyword(id, 1)))
  const score = new Map()
  for (const list of lists) {
    for (const r of list) {
      // Hint check: pass through if EITHER language or origin matches when
      // those hints are provided. If neither hint is set, nothing is filtered.
      if (originalLanguage || originCountry) {
        const langOk = originalLanguage ? r.original_language === originalLanguage : false
        const countryOk = originCountry ? r.origin_country?.includes(originCountry) : false
        if (!langOk && !countryOk) continue
      }
      const entry = score.get(r.id) ?? { item: r, score: 0 }
      entry.score += 1
      score.set(r.id, entry)
    }
  }
  const out = [...score.values()]
    .sort((a, b) => b.score - a.score || (b.item.vote_count ?? 0) - (a.item.vote_count ?? 0))
    .map(({ item, score: s }) => ({
      ...item,
      media_type: 'movie',
      __subjectMatched: true,
      __subjectScore: s,
    }))
  subjectCache.set(cacheK, out)
  return out
}

// TV has no /keyword/{id}/tv endpoint, so we score relevance ourselves:
// 1. Fetch a candidate pool of regional TV (lang + origin, no keyword filter)
// 2. For each candidate, fetch /tv/{id}/keywords
// 3. Score by exact keyword-id overlap with center
// 4. Drop everything with zero overlap, sort by score desc
//
// This is more expensive than discoverBySubject (one keyword fetch per
// candidate) but caches aggressively. Limited to top-18 candidates so it stays
// under ~20 extra requests per TV search.
export async function discoverTvBySubject({
  centerKeywordIds = [],
  originalLanguage = null,
  originCountry = null,
}) {
  if (!centerKeywordIds.length) return []
  const cacheK = `${centerKeywordIds.slice(0, 5).join(',')}:${originalLanguage ?? ''}:${originCountry ?? ''}`
  if (tvSubjectCache.has(cacheK)) return tvSubjectCache.get(cacheK)

  const baseParams = {
    sort_by: 'popularity.desc',
    include_adult: false,
  }
  if (originalLanguage) baseParams.with_original_language = originalLanguage
  if (originCountry) baseParams.with_origin_country = originCountry

  // Two pages = ~40 candidates by popularity, then we keep the top 18 to score.
  const [p1, p2] = await Promise.all([
    client.get('/discover/tv', { params: { ...baseParams, page: 1 } }).catch(() => null),
    client.get('/discover/tv', { params: { ...baseParams, page: 2 } }).catch(() => null),
  ])
  const seen = new Set()
  const pool = []
  for (const r of [...(p1?.data?.results ?? []), ...(p2?.data?.results ?? [])]) {
    if (!r.poster_path || seen.has(r.id)) continue
    seen.add(r.id)
    pool.push(r)
  }
  const candidates = pool.slice(0, 18)

  const centerSet = new Set(centerKeywordIds)
  const scored = await Promise.all(
    candidates.map(async (c) => {
      try {
        const kws = await getKeywords('tv', c.id)
        let score = 0
        for (const k of kws ?? []) if (centerSet.has(k.id)) score++
        return { item: c, score }
      } catch {
        return { item: c, score: 0 }
      }
    }),
  )

  const matches = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || (b.item.vote_count ?? 0) - (a.item.vote_count ?? 0))
    .map(({ item, score: s }) => ({
      ...item,
      media_type: 'tv',
      __subjectMatched: true,
      __subjectScore: s,
    }))

  tvSubjectCache.set(cacheK, matches)
  return matches
}

// /discover pool used to inject regional-language content into rec graphs.
// Strategy is genre + subject (keywords) first, never rating. Three queries
// run in parallel for a fuller pool:
//   1. with_genres + with_keywords  (strict: same genre AND same subject)
//   2. with_keywords (no genre)     (relaxed: same subject, any genre)
//   3. with_genres only             (broad: same genre, popular)
// Items from #1 and #2 are tagged `__subjectMatched: true` so the connection-
// reason logic can label edges as "Same Subject" downstream.
export async function discoverByLanguage(mediaType, language, opts = {}) {
  const { genreId = null, keywordIds = [], originCountry = null } = opts
  if (!language || language === 'any' || language === 'en') return []
  const type = mediaType === 'tv' ? 'tv' : 'movie'
  const kw = keywordIds.slice(0, 5)
  const cacheK = `${type}:${language}:${genreId ?? ''}:${kw.join(',')}:${originCountry ?? ''}`
  if (discoverCache.has(cacheK)) return discoverCache.get(cacheK)

  const baseParams = {
    with_original_language: language,
    sort_by: 'popularity.desc',
    include_adult: false,
  }
  if (originCountry) baseParams.with_origin_country = originCountry

  const callDefs = []
  if (kw.length) {
    // 1. strict — genre AND subject
    if (genreId) {
      callDefs.push({
        params: { ...baseParams, with_genres: genreId, with_keywords: kw.join('|'), page: 1 },
        tag: 'subject',
      })
    }
    // 2. relaxed — subject only (any genre)
    callDefs.push({
      params: { ...baseParams, with_keywords: kw.join('|'), page: 1 },
      tag: 'subject',
    })
  }
  // 3. broad — genre popularity, two pages
  if (genreId) {
    for (const page of [1, 2]) {
      callDefs.push({
        params: { ...baseParams, with_genres: genreId, page },
        tag: 'genre',
      })
    }
  } else {
    callDefs.push({ params: { ...baseParams, page: 1 }, tag: 'genre' })
  }

  const responses = await Promise.all(
    callDefs.map((d) => client.get(`/discover/${type}`, { params: d.params }).catch(() => null)),
  )

  const seen = new Set()
  const out = []
  responses.forEach((resp, i) => {
    if (!resp) return
    const tag = callDefs[i].tag
    for (const r of resp.data?.results ?? []) {
      if (seen.has(r.id) || !r.poster_path) continue
      seen.add(r.id)
      out.push({
        ...r,
        media_type: type,
        __subjectMatched: tag === 'subject',
      })
    }
  })
  discoverCache.set(cacheK, out)
  return out
}

export function getCredits(mediaType, id) {
  return guarded(
    async () => {
      const k = cacheKey(mediaType, id)
      if (creditsCache.has(k)) return creditsCache.get(k)
      const { data } = await client.get(`/${mediaType}/${id}/credits`)
      creditsCache.set(k, data)
      return data
    },
    () => fallback.getCredits(mediaType, id),
  )
}

export function getWatchProviders(mediaType, id, region = DEFAULT_REGION) {
  return guarded(
    async () => {
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
    },
    () => fallback.getWatchProviders(mediaType, id, region),
  )
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
