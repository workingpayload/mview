// Recommendations are pre-filtered to items sharing at least one genre with
// the centre. This function picks the strongest *label* for that edge:
//   director → also shares a director (richest signal worth surfacing)
//   cast     → also shares a top-billed actor
//   genre    → default — the shared genre that qualified the rec
// `recommended` only fires for edge cases where centre has no genres at all.
import { primaryGenreId, genreLabel } from '@/lib/genres'

const KIND_RANK = {
  director: 5,
  cast: 4,
  genre: 3,
  recommended: 1,
}

export const EDGE_KIND_COLORS = {
  director: '#f97316',    // orange
  cast: '#22d3ee',        // cyan
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
  // 3. Genre — the actual filter that qualified this rec. Prefer the rec's
  //    primary genre when it matches centre's primary, otherwise pick the
  //    first shared genre from centre's list.
  const centerGenreIds = (centerDetails?.genres ?? []).map((g) => g.id)
  const recGenreIds = rec?.genre_ids ?? []
  const recPrimary = primaryGenreId(rec)
  let sharedGenre = null
  if (recPrimary && centerGenreIds.includes(recPrimary)) {
    sharedGenre = recPrimary
  } else {
    sharedGenre = centerGenreIds.find((g) => recGenreIds.includes(g)) ?? null
  }
  if (sharedGenre) {
    return { kind: 'genre', label: `Same Genre · ${genreLabel(sharedGenre)}`, weight: KIND_RANK.genre }
  }
  // 4. Defensive fallback — should rarely fire because the rec list is genre-filtered.
  return { kind: 'recommended', label: 'Recommended', weight: KIND_RANK.recommended }
}

function directorsOf(credits) {
  if (!credits) return []
  return (credits.crew ?? []).filter((c) => c.job === 'Director' || (c.department === 'Directing' && c.job === 'Director'))
}
