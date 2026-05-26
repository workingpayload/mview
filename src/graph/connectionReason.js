// Given the center item (its details + credits) and a recommendation item (basic search result),
// determine the strongest connection reason. Returns { kind, label, weight }.
// kind is also used for edge color tinting.
import { primaryGenreId, genreLabel } from '@/lib/genres'

const KIND_RANK = {
  director: 5,
  cast: 4,
  genre: 3,
  rating: 2,
  recommended: 1,
}

export const EDGE_KIND_COLORS = {
  director: '#f97316',  // orange
  cast: '#22d3ee',      // cyan
  genre: '#a78bfa',     // violet
  rating: '#34d399',    // emerald
  recommended: '#737373', // neutral
}

export function pickConnectionReason({ centerDetails, centerCredits, rec, recCredits }) {
  // Director match — only meaningful for movies; tv uses created_by but we'll try crew too.
  const centerDirectors = directorsOf(centerCredits)
  if (recCredits) {
    const recDirectors = directorsOf(recCredits)
    const sharedDir = centerDirectors.find((d) => recDirectors.some((rd) => rd.id === d.id))
    if (sharedDir) {
      return { kind: 'director', label: `Directed by ${sharedDir.name}`, weight: KIND_RANK.director }
    }
    // shared lead actor (top 3 of each)
    const centerLeads = (centerCredits?.cast ?? []).slice(0, 6)
    const recLeads = (recCredits?.cast ?? []).slice(0, 6)
    const sharedActor = centerLeads.find((c) => recLeads.some((r) => r.id === c.id))
    if (sharedActor) {
      return { kind: 'cast', label: `Starring ${sharedActor.name}`, weight: KIND_RANK.cast }
    }
  }
  // shared primary genre
  const centerGenre = primaryGenreId(centerDetails)
  const recGenre = primaryGenreId(rec)
  if (centerGenre && recGenre && centerGenre === recGenre) {
    return { kind: 'genre', label: `Same Genre · ${genreLabel(centerGenre)}`, weight: KIND_RANK.genre }
  }
  // close rating (within 0.5)
  const cv = centerDetails?.vote_average ?? 0
  const rv = rec?.vote_average ?? 0
  if (cv > 0 && rv > 0 && Math.abs(cv - rv) <= 0.5) {
    return { kind: 'rating', label: 'Similar Rating', weight: KIND_RANK.rating }
  }
  return { kind: 'recommended', label: 'Recommended Match', weight: KIND_RANK.recommended }
}

function directorsOf(credits) {
  if (!credits) return []
  return (credits.crew ?? []).filter((c) => c.job === 'Director' || c.department === 'Directing' && c.job === 'Director')
}
