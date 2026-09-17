// Fallback metadata layer. Public surface mirrors the TMDB exports in
// tmdb.js so the rest of the app doesn't need to know which backend served
// a given result. Internally:
//   - Trakt provides search, details, related, people, trending.
//   - Fanart.tv provides posters/backdrops (full URLs).
//   - OMDb provides a poster fallback when Fanart has no match.
import {
  traktSearch,
  traktDetails,
  traktRelated,
  traktPeople,
  traktTrending,
  traktIdFromTmdb,
} from './trakt'
import { fanartImages } from './fanart'
import { omdbPoster } from './omdb'

// Trakt uses slugs for genres ("action", "science-fiction"). Map them to the
// TMDB numeric ids the rest of the app already speaks. Unmapped slugs are
// dropped — the resulting genre_ids array is what graphStore's filterByGenre
// reads, so it must use the same vocabulary.
const GENRE_SLUG_TO_TMDB = {
  action: 28,
  adventure: 12,
  animation: 16,
  anime: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  musical: 10402,
  mystery: 9648,
  romance: 10749,
  'science-fiction': 878,
  scifi: 878,
  thriller: 53,
  suspense: 53,
  war: 10752,
  western: 37,
  biography: 18,
  // TV-specific Trakt slugs
  'action-adventure': 10759,
  kids: 10762,
  children: 10762,
  news: 10763,
  reality: 10764,
  soap: 10766,
  'talk-show': 10767,
  'war-politics': 10768,
}

function genreIdsFromSlugs(slugs) {
  if (!Array.isArray(slugs)) return []
  const out = []
  for (const s of slugs) {
    const id = GENRE_SLUG_TO_TMDB[s]
    if (id && !out.includes(id)) out.push(id)
  }
  return out
}

function genresFromSlugs(slugs) {
  return genreIdsFromSlugs(slugs).map((id) => ({ id, name: nameForId(id) }))
}

const TMDB_GENRE_NAMES = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
  10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics',
}
function nameForId(id) {
  return TMDB_GENRE_NAMES[id] ?? 'Unknown'
}

// Look up an item's image: Fanart (preferred) then OMDb (poster only).
async function resolveImages(mediaType, ids) {
  const fanartId = mediaType === 'tv' ? ids?.tvdb : ids?.tmdb
  if (fanartId) {
    const imgs = await fanartImages(mediaType, fanartId)
    if (imgs?.poster) return { poster_path: imgs.poster, backdrop_path: imgs.backdrop ?? null }
  }
  if (ids?.imdb) {
    const poster = await omdbPoster(ids.imdb)
    if (poster) return { poster_path: poster, backdrop_path: null }
  }
  return { poster_path: null, backdrop_path: null }
}

// Shape a Trakt movie/show object into the TMDB-flavoured result objects the
// app expects. `mediaType` is the discriminator ('movie' | 'tv').
async function shapeWithImages(t, mediaType) {
  if (!t) return null
  const imgs = await resolveImages(mediaType, t.ids)
  return shapeWithoutImages(t, mediaType, imgs)
}

function shapeWithoutImages(t, mediaType, imgs = { poster_path: null, backdrop_path: null }) {
  const id = t.ids?.tmdb ?? t.ids?.trakt ?? null
  if (!id) return null
  return {
    id,
    media_type: mediaType,
    title: mediaType === 'movie' ? t.title : undefined,
    name: mediaType === 'tv' ? t.title : undefined,
    overview: t.overview ?? '',
    poster_path: imgs.poster_path,
    backdrop_path: imgs.backdrop_path,
    vote_average: typeof t.rating === 'number' ? t.rating : 0,
    vote_count: t.votes ?? 0,
    release_date: mediaType === 'movie' ? (t.released ?? null) : null,
    first_air_date: mediaType === 'tv' ? (t.first_aired ? t.first_aired.slice(0, 10) : null) : null,
    original_language: t.language ?? 'en',
    origin_country: t.country ? [String(t.country).toUpperCase()] : [],
    genre_ids: genreIdsFromSlugs(t.genres),
    // Stash external ids so subsequent calls (details/related/credits) can
    // find their way back to Trakt without re-resolving.
    __traktSlug: t.ids?.slug ?? null,
    __imdbId: t.ids?.imdb ?? null,
    __tvdbId: t.ids?.tvdb ?? null,
  }
}

// Trakt search wraps the matched item in { type, movie | show }.
export async function searchMulti(query) {
  const raw = await traktSearch(query)
  if (!raw.length) return []
  const shaped = await Promise.all(
    raw.map(async (entry) => {
      const mediaType = entry.type === 'show' ? 'tv' : 'movie'
      const t = entry[entry.type]
      return shapeWithImages(t, mediaType)
    }),
  )
  return shaped.filter((r) => r && r.poster_path)
}

export async function getTrending() {
  const raw = await traktTrending()
  if (!raw.length) return []
  const shaped = await Promise.all(
    raw.map(async (entry) => shapeWithImages(entry.wrap, entry.media_type)),
  )
  return shaped.filter((r) => r && r.poster_path)
}

// Trakt details — we accept a TMDB id (canonical in the app) and resolve a
// Trakt slug under the hood. Returns a TMDB-shaped details object.
export async function getDetails(mediaType, tmdbId) {
  const slug = await traktIdFromTmdb(mediaType, tmdbId)
  if (!slug) return shapeDetails({ ids: { tmdb: tmdbId } }, mediaType, null)
  const t = await traktDetails(mediaType, slug).catch(() => null)
  if (!t) return shapeDetails({ ids: { tmdb: tmdbId } }, mediaType, null)
  const imgs = await resolveImages(mediaType, t.ids)
  return shapeDetails(t, mediaType, imgs)
}

function shapeDetails(t, mediaType, imgs) {
  const base = shapeWithoutImages(t, mediaType, imgs ?? { poster_path: null, backdrop_path: null })
  if (!base) return null
  return {
    ...base,
    // Details-only TMDB fields graphStore reads:
    genres: genresFromSlugs(t.genres),
    runtime: t.runtime ?? null,
    status: t.status ?? null,
    tagline: t.tagline ?? '',
  }
}

export async function getRecommendations(mediaType, tmdbId) {
  const slug = await traktIdFromTmdb(mediaType, tmdbId)
  if (!slug) return []
  const related = await traktRelated(mediaType, slug)
  if (!related.length) return []
  const shaped = await Promise.all(related.map((t) => shapeWithImages(t, mediaType)))
  return shaped.filter((r) => r && r.poster_path)
}

// Trakt /people returns { cast: [{ character, person }], crew: { directing:[{job, person}], ... } }.
// Reshape to TMDB's { cast: [{ id, name, ... }], crew: [{ id, name, job, department }] }.
export async function getCredits(mediaType, tmdbId) {
  const slug = await traktIdFromTmdb(mediaType, tmdbId)
  if (!slug) return { cast: [], crew: [] }
  const p = await traktPeople(mediaType, slug)
  if (!p) return { cast: [], crew: [] }
  const cast = (p.cast ?? []).map((c) => ({
    id: c.person?.ids?.tmdb ?? c.person?.ids?.trakt,
    name: c.person?.name ?? '',
    character: c.character ?? '',
  }))
  const crew = []
  for (const dept of Object.keys(p.crew ?? {})) {
    for (const c of p.crew[dept] ?? []) {
      crew.push({
        id: c.person?.ids?.tmdb ?? c.person?.ids?.trakt,
        name: c.person?.name ?? '',
        job: c.job ?? '',
        department: prettyDept(dept),
      })
    }
  }
  return { cast, crew }
}
function prettyDept(slug) {
  return slug
    .split(' ')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
}

// Watch providers — Trakt doesn't surface streaming availability the way
// TMDB does. Return an empty shape so the app degrades gracefully (badges
// just don't render).
export async function getWatchProviders(/* mediaType, tmdbId, region */) {
  return { providers: [], link: null }
}

// Keywords are TMDB-specific. We don't use them anymore (genre-only recs),
// but keep a stub for API parity in case anything else calls them.
export async function getKeywords() {
  return []
}

// Trending was the only `imgUrl`-free path before. In fallback mode all
// poster_path values are already full URLs, so the caller's existing
// imgUrl(path, size) will pass them through unchanged (tmdb.js's imgUrl
// recognises absolute URLs).
