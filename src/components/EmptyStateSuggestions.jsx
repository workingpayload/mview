import { useEffect, useState } from 'react'
import { Film, Tv, Flame, Sparkles, Star } from 'lucide-react'
import { getTrending, imgUrl, title, year } from '@/api/tmdb'
import { useGraph } from '@/state/graphStore'
import { focusSearch, openFilters } from '@/lib/searchBus'
import { cn } from '@/lib/utils'

function isMac() {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
}

export function EmptyStateSuggestions() {
  const { focusItem } = useGraph()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const mod = isMac() ? '⌘' : 'Ctrl'

  useEffect(() => {
    let cancelled = false
    getTrending()
      .then((r) => {
        if (!cancelled) setItems(r.slice(0, 6))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
      <div className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-dashed border-border/60 bg-background/70 p-5 sm:p-7 text-center backdrop-blur">
        <div className="mb-1 flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold">Start with a title</h2>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Search a movie or series and watch the recommendation graph build outward.
        </p>

        <div className="mb-5 flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
          <Shortcut label="/" /> <span>or</span> <Shortcut label={`${mod} K`} />
          <span>search</span>
          <span className="mx-1 opacity-50">·</span>
          <Shortcut label="F" /> <span>filters</span>
          <span className="mx-1 opacity-50">·</span>
          <Shortcut label="Esc" /> <span>clear</span>
        </div>

        <div className="mb-2 flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Flame className="h-3 w-3" />
          Trending this week
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] animate-pulse rounded-md bg-muted/50" />
            ))}
          {!loading &&
            items.map((r) => (
              <button
                key={`${r.media_type}-${r.id}`}
                onClick={() => focusItem(r)}
                className={cn(
                  'group relative aspect-[2/3] overflow-hidden rounded-md border border-border/60 bg-muted text-left',
                  'transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg',
                )}
                title={title(r)}
              >
                {r.poster_path ? (
                  <img
                    src={imgUrl(r.poster_path, 'w185')}
                    alt={title(r)}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    {r.media_type === 'tv' ? <Tv className="h-5 w-5" /> : <Film className="h-5 w-5" />}
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-1.5">
                  <div className="line-clamp-2 text-[10px] font-medium leading-tight text-white drop-shadow">
                    {title(r)}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-[9px] text-white/80">
                    <span>{year(r) ?? '—'}</span>
                    {r.vote_average ? (
                      <span className="inline-flex items-center gap-0.5">
                        <Star className="h-2 w-2 fill-yellow-400 text-yellow-400" />
                        {r.vote_average.toFixed(1)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  )
}

function Shortcut({ label }) {
  return (
    <kbd className="inline-flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px] font-semibold text-foreground">
      {label}
    </kbd>
  )
}
