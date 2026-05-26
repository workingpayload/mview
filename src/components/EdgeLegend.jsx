import { useState } from 'react'
import { Info, ChevronDown } from 'lucide-react'
import { EDGE_KIND_COLORS } from '@/graph/connectionReason'
import { cn } from '@/lib/utils'

const ITEMS = [
  { kind: 'director', label: 'Same director' },
  { kind: 'cast', label: 'Shared cast' },
  { kind: 'subject', label: 'Same subject' },
  { kind: 'genre', label: 'Same genre' },
  { kind: 'recommended', label: 'Recommended' },
]

export function EdgeLegend() {
  const [open, setOpen] = useState(true)
  return (
    <div className="pointer-events-auto absolute right-3 bottom-3 z-10 hidden sm:block">
      <div
        className={cn(
          'rounded-md border bg-card/95 shadow-md backdrop-blur transition-all',
          open ? 'p-2' : 'p-1',
        )}
      >
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          <span className="inline-flex items-center gap-1.5">
            <Info className="h-3 w-3" />
            Edge legend
          </span>
          <ChevronDown
            className={cn('h-3 w-3 transition-transform', !open && '-rotate-90')}
          />
        </button>
        {open && (
          <div className="mt-1.5 space-y-1 px-1.5 pb-1">
            {ITEMS.map((it) => (
              <div key={it.kind} className="flex items-center gap-2 text-[11px]">
                <span
                  className="inline-block h-[2px] w-6 rounded-full"
                  style={{ background: EDGE_KIND_COLORS[it.kind] }}
                />
                <span className="text-muted-foreground">{it.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
