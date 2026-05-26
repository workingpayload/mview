// Given the center item (its details + credits) and a recommendation item (basic search result),
// determine the strongest connection reason. Returns { kind, label, weight }.
// kind is also used for edge color tinting.
//
// Tier order (highest first):
//   director  → shared director (most informative)
//   cast      → shared lead actor
//   subject   → tagged from discover-by-keywords (TMDB keyword overlap)
//   genre     → same primary genre
//   recommended → fallback (TMDB's algorithm with no detectable overlap)
//
// Rating-based linking was removed: similar vote averages are not a meaningful
// recommendation signal compared with genre + subject overlap.
import { primaryGenreId, genreLabel } from '@/lib/genres'

const KIND_RANK = {
  director: 5,
  cast: 4,
  subject: 3.5,
  genre: 3,
  recommended: 1,
}

export const EDGE_KIND_COLORS = {
  director: '#f97316',    // orange
  cast: '#22d3ee',        // cyan
  subject: '#ec4899',     // pink
  genre: '#a78bfa',       // violet
  recommended: '#737373', // neutral
}

export function pickConnectionReason({ centerDetails, centerCredits, rec, recCredits }) {
  // 1. Shared director
  const centerDirectors = directorsOf(centerCredits)
  if (recCredits) {
    const recDirectors = directorsOf(recCredits)
    const sharedDir = centerDirectors.find((d) => recDirectors.some((rd) => rd.id === d.id))
    if (sharedDir) {
      return { kind: 'director', label: `Directed by ${sharedDir.name}`, weight: KIND_RANK.director }
    }
    // 2. Shared top-billed cast
    const centerLeads = (centerCredits?.cast ?? []).slice(0, 6)
    const recLeads = (recCredits?.cast ?? []).slice(0, 6)
    const sharedActor = centerLeads.find((c) => recLeads.some((r) => r.id === c.id))
    if (sharedActor) {
      return { kind: 'cast', label: `Starring ${sharedActor.name}`, weight: KIND_RANK.cast }
    }
  }
  // 3. Same TMDB keyword/subject (tagged by /discover with_keywords)
  if (rec?.__subjectMatched) {
    return { kind: 'subject', label: 'Same Subject', weight: KIND_RANK.subject }
  }
  // 4. Same primary genre
  const centerGenre = primaryGenreId(centerDetails)
  const recGenre = primaryGenreId(rec)
  if (centerGenre && recGenre && centerGenre === recGenre) {
    return { kind: 'genre', label: `Same Genre · ${genreLabel(centerGenre)}`, weight: KIND_RANK.genre }
  }
  // 5. Fallback
  return { kind: 'recommended', label: 'Recommended Match', weight: KIND_RANK.recommended }
}

function directorsOf(credits) {
  if (!credits) return []
  return (credits.crew ?? []).filter((c) => c.job === 'Director' || (c.department === 'Directing' && c.job === 'Director'))
}
