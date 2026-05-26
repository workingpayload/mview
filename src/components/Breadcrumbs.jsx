import { useRef } from 'react'
import { ChevronRight, History } from 'lucide-react'
import { useGraph } from '@/state/graphStore'
import { imgUrl } from '@/api/tmdb'
import { cn } from '@/lib/utils'

export function Breadcrumbs() {
  const { crumbs, centerId, expandFromNode, focusItem } = useGraph()
  const scrollRef = useRef(null)

  if (!crumbs?.length) return null

  const handleClick = (c) => {
    // If the title is still on the canvas, just recenter via expandFromNode.
    // Otherwise treat it like a fresh search (focusItem builds a new graph).
    if (c.id === centerId) return
    // Use expandFromNode when the node is present; fall back to focusItem.
    expandFromNode(c.id).catch(() => {
      focusItem({
        id: c.tmdbId,
        media_type: c.mediaType,
        title: c.title,
        poster_path: c.posterPath,
      })
    })
  }

  return (
    <div className="border-b border-border/40 bg-background/70 backdrop-blur">
      <div className="flex items-center gap-2 overflow-hidden px-3 py-1.5 sm:px-4">
        <History className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground sm:block" />
        <div
          ref={scrollRef}
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scroll-smooth"
          style={{ scrollbarWidth: 'thin' }}
        >
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1
            return (
              <div key={c.id} className="flex items-center gap-1">
                <button
                  onClick={() => handleClick(c)}
                  className={cn(
                    'group inline-flex shrink-0 items-center gap-1.5 rounded-md border border-transparent px-1.5 py-1 text-xs transition',
                    isLast
                      ? 'cursor-default border-border bg-card text-foreground'
                      : 'text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground',
                  )}
                  title={`${c.title}${c.year ? ` (${c.year})` : ''}`}
                  disabled={isLast}
                >
                  {c.posterPath ? (
                    <img
                      src={imgUrl(c.posterPath, 'w92')}
                      alt=""
                      className="h-5 w-[14px] shrink-0 rounded-sm object-cover"
                      draggable={false}
                    />
                  ) : (
                    <span className="h-5 w-[14px] shrink-0 rounded-sm bg-muted" />
                  )}
                  <span className="max-w-[160px] truncate font-medium">{c.title}</span>
                </button>
                {!isLast && <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
