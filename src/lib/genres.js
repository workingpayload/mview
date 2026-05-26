// TMDB genre ids -> human-readable + accent color (HSL string, used in node ring/edge tint)
export const GENRES = {
  28: { name: 'Action', hue: 0 },
  12: { name: 'Adventure', hue: 30 },
  16: { name: 'Animation', hue: 280 },
  35: { name: 'Comedy', hue: 50 },
  80: { name: 'Crime', hue: 350 },
  99: { name: 'Documentary', hue: 200 },
  18: { name: 'Drama', hue: 220 },
  10751: { name: 'Family', hue: 140 },
  14: { name: 'Fantasy', hue: 270 },
  36: { name: 'History', hue: 25 },
  27: { name: 'Horror', hue: 300 },
  10402: { name: 'Music', hue: 320 },
  9648: { name: 'Mystery', hue: 250 },
  10749: { name: 'Romance', hue: 340 },
  878: { name: 'Sci-Fi', hue: 190 },
  10770: { name: 'TV Movie', hue: 60 },
  53: { name: 'Thriller', hue: 10 },
  10752: { name: 'War', hue: 15 },
  37: { name: 'Western', hue: 35 },
  // tv-specific
  10759: { name: 'Action & Adventure', hue: 5 },
  10762: { name: 'Kids', hue: 130 },
  10763: { name: 'News', hue: 210 },
  10764: { name: 'Reality', hue: 290 },
  10765: { name: 'Sci-Fi & Fantasy', hue: 195 },
  10766: { name: 'Soap', hue: 330 },
  10767: { name: 'Talk', hue: 240 },
  10768: { name: 'War & Politics', hue: 20 },
}

export function primaryGenreId(item) {
  return item?.genre_ids?.[0] ?? item?.genres?.[0]?.id ?? null
}

export function genreLabel(id) {
  return GENRES[id]?.name ?? 'Unknown'
}

export function genreHue(id) {
  return GENRES[id]?.hue ?? 220
}

export function genreColor(id, lightness = 60, saturation = 70, alpha = 1) {
  const h = genreHue(id)
  return `hsla(${h}, ${saturation}%, ${lightness}%, ${alpha})`
}

export const ALL_GENRE_OPTIONS = Object.entries(GENRES)
  .map(([id, g]) => ({ id: Number(id), name: g.name }))
  .sort((a, b) => a.name.localeCompare(b.name))
