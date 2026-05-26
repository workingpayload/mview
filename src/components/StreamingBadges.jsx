import { Badge } from '@/components/ui/badge'
import { PLATFORMS, platformForKey, searchUrlFor } from '@/lib/providers'
import { cn } from '@/lib/utils'

const PLATFORM_TINT = {
  netflix: 'bg-red-600/90 text-white border-transparent',
  prime: 'bg-sky-600/90 text-white border-transparent',
  disney: 'bg-blue-700/95 text-white border-transparent',
  hotstar: 'bg-indigo-900/95 text-white border-transparent',
  hbo: 'bg-purple-700/90 text-white border-transparent',
  hulu: 'bg-emerald-500/90 text-black border-transparent',
  apple: 'bg-zinc-100/95 text-black border-transparent',
  paramount: 'bg-blue-500/90 text-white border-transparent',
}

export function StreamingBadges({ keys = [], size = 'sm', limit = 4, linkTitle = null }) {
  if (!keys.length) return null
  const shown = keys.slice(0, limit)
  const extra = keys.length - shown.length
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((k) => {
        const p = platformForKey(k)
        if (!p) return null
        const cls = cn(
          'rounded-md px-1.5 py-0 text-[10px] font-bold tracking-wide',
          PLATFORM_TINT[k] ?? 'bg-muted text-foreground',
          size === 'xs' && 'text-[9px] px-1',
          linkTitle && 'transition-transform hover:-translate-y-0.5 hover:brightness-110',
        )
        const url = linkTitle ? searchUrlFor(k, linkTitle) : null
        if (url) {
          return (
            <a
              key={k}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title={`Search ${p.label} for "${linkTitle}"`}
              onClick={(e) => e.stopPropagation()}
            >
              <Badge className={cls}>{p.short}</Badge>
            </a>
          )
        }
        return (
          <Badge key={k} className={cls}>
            {p.short}
          </Badge>
        )
      })}
      {extra > 0 && (
        <Badge variant="outline" className="rounded-md px-1.5 py-0 text-[10px] font-medium">
          +{extra}
        </Badge>
      )}
    </div>
  )
}

export function AllPlatforms() {
  return PLATFORMS
}
