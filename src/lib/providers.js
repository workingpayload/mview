// Streaming platform filter options (TMDB provider ids).
// The user-facing toggle list is intentionally short — these map onto provider_id
// values returned by /movie/{id}/watch/providers (US region by default).
export const PLATFORMS = [
  { key: 'netflix', label: 'Netflix', tmdbIds: [8], short: 'N' },
  { key: 'prime', label: 'Prime Video', tmdbIds: [9, 119, 10], short: 'Pr' },
  { key: 'disney', label: 'Disney+', tmdbIds: [337], short: 'D+' },
  { key: 'hotstar', label: 'Disney+ Hotstar', tmdbIds: [122, 619], short: 'D+H' },
  { key: 'jiocinema', label: 'JioCinema', tmdbIds: [220, 484, 121], short: 'JC' },
  { key: 'zee5', label: 'ZEE5', tmdbIds: [232], short: 'Z5' },
  { key: 'sonyliv', label: 'SonyLIV', tmdbIds: [237], short: 'SL' },
  { key: 'mxplayer', label: 'MX Player', tmdbIds: [458], short: 'MX' },
  { key: 'aha', label: 'aha', tmdbIds: [1351], short: 'aha' },
  { key: 'erosnow', label: 'Eros Now', tmdbIds: [268], short: 'EN' },
  { key: 'hbo', label: 'HBO Max', tmdbIds: [1899, 384, 1825], short: 'HBO' },
  { key: 'hulu', label: 'Hulu', tmdbIds: [15], short: 'Hu' },
  { key: 'apple', label: 'Apple TV+', tmdbIds: [350, 2], short: 'A' },
  { key: 'paramount', label: 'Paramount+', tmdbIds: [531, 521], short: 'P+' },
]

const ID_TO_KEY = new Map()
for (const p of PLATFORMS) for (const id of p.tmdbIds) ID_TO_KEY.set(id, p.key)

export function providerKey(providerId) {
  return ID_TO_KEY.get(providerId) ?? null
}

export function platformForKey(key) {
  return PLATFORMS.find((p) => p.key === key)
}

export function activePlatformsForItem(providers) {
  const keys = new Set()
  for (const p of providers ?? []) {
    const k = providerKey(p.provider_id)
    if (k) keys.add(k)
  }
  return [...keys]
}

// Direct search URLs per platform. Each takes the movie/series title and returns
// a URL that opens the streaming service's own search results for it.
const SEARCH_URLS = {
  netflix: (q) => `https://www.netflix.com/search?q=${encodeURIComponent(q)}`,
  prime: (q) => `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(q)}`,
  disney: (q) => `https://www.disneyplus.com/search?q=${encodeURIComponent(q)}`,
  hotstar: (q) => `https://www.hotstar.com/in/search?q=${encodeURIComponent(q)}`,
  jiocinema: (q) => `https://www.jiocinema.com/search/${encodeURIComponent(q)}`,
  zee5: (q) => `https://www.zee5.com/search?q=${encodeURIComponent(q)}`,
  sonyliv: (q) => `https://www.sonyliv.com/search/${encodeURIComponent(q)}`,
  mxplayer: (q) => `https://www.mxplayer.in/search?q=${encodeURIComponent(q)}`,
  aha: (q) => `https://www.aha.video/search?q=${encodeURIComponent(q)}`,
  erosnow: (q) => `https://erosnow.com/search?q=${encodeURIComponent(q)}`,
  hbo: (q) => `https://play.max.com/search/result?q=${encodeURIComponent(q)}`,
  hulu: (q) => `https://www.hulu.com/search?q=${encodeURIComponent(q)}`,
  apple: (q) => `https://tv.apple.com/search?term=${encodeURIComponent(q)}`,
  paramount: (q) => `https://www.paramountplus.com/search/?searchTerm=${encodeURIComponent(q)}`,
}

export function searchUrlFor(key, title) {
  const fn = SEARCH_URLS[key]
  return fn && title ? fn(title) : null
}
