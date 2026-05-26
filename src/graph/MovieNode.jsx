import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Star, Film, Tv, Loader2, ExternalLink } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { StreamingBadges } from '@/components/StreamingBadges'
import { genreColor, genreLabel } from '@/lib/genres'
import { imgUrl } from '@/api/tmdb'
import { cn } from '@/lib/utils'

function MovieNodeBase({ data, selected }) {
  const accent = genreColor(data.genreId, 60, 75, 1)
  const accentSoft = genreColor(data.genreId, 50, 60, 0.18)
  const isCenter = !!data.isCenter
  const visited = !!data.visited

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className={cn(
            'group relative cursor-pointer transition-transform duration-200 ease-out will-change-transform',
            isCenter
              ? 'scale-110 hover:-translate-y-1 hover:scale-[1.18]'
              : 'hover:-translate-y-1 hover:scale-[1.08]',
          )}
        >
          <Card
            className={cn(
              'relative w-[160px] overflow-hidden border bg-card/95 backdrop-blur transition-all duration-200',
              isCenter
                ? 'ring-2 ring-offset-2 ring-offset-background shadow-2xl group-hover:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.85)]'
                : 'shadow-md group-hover:shadow-2xl group-hover:ring-1 group-hover:ring-white/10',
              selected && 'ring-2 ring-primary',
              !visited && !isCenter && 'opacity-95 group-hover:opacity-100',
              visited && !isCenter && 'opacity-70 group-hover:opacity-100',
            )}
            style={{
              borderColor: isCenter ? accent : 'hsl(var(--border))',
              boxShadow: isCenter
                ? `0 0 0 1px ${accent}, 0 10px 40px -10px ${accent}`
                : `inset 0 0 0 1px ${accentSoft}`,
            }}
          >
            <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
              {data.posterPath ? (
                <img
                  src={imgUrl(data.posterPath, 'w342')}
                  alt={data.title}
                  loading="lazy"
                  draggable={false}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  {data.mediaType === 'tv' ? <Tv className="h-8 w-8" /> : <Film className="h-8 w-8" />}
                </div>
              )}
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/40 to-transparent"
              />
              <div className="absolute left-2 top-2 flex items-center gap-1">
                <Badge
                  className="rounded-md border-transparent px-1.5 py-0 text-[10px] font-semibold text-black"
                  style={{ background: accent }}
                >
                  {genreLabel(data.genreId)}
                </Badge>
              </div>
              <div className="absolute right-2 top-2">
                <Badge variant="secondary" className="rounded-md border-transparent bg-black/65 px-1.5 py-0 text-[10px] font-semibold text-white">
                  <Star className="mr-0.5 h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                  {data.rating}
                </Badge>
              </div>
              <div className="absolute inset-x-2 bottom-2 flex flex-col gap-1">
                <div className="text-[13px] font-semibold leading-tight text-white drop-shadow-md line-clamp-2">
                  {data.title}
                </div>
                <div className="flex items-center justify-between gap-1 text-[10px] text-white/85">
                  <span className="font-medium">{data.year ?? '—'}</span>
                  <span className="uppercase tracking-wider">
                    {data.mediaType === 'tv' ? 'Series' : 'Movie'}
                  </span>
                </div>
                <div className="mt-0.5">
                  <StreamingBadges keys={data.providerKeys} size="xs" limit={3} />
                </div>
              </div>
            </div>
            {data.expanding && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </Card>
          <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-none !bg-transparent" isConnectable={false} />
          <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-none !bg-transparent" isConnectable={false} />
        </div>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-80 p-0 overflow-hidden">
        {data.backdropPath || data.posterPath ? (
          <div className="relative h-28 w-full overflow-hidden">
            <img
              src={imgUrl(data.backdropPath ?? data.posterPath, 'w500')}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-popover via-popover/60 to-transparent" />
          </div>
        ) : null}
        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm font-semibold leading-tight">{data.title}</div>
            <Badge variant="secondary" className="shrink-0">
              <Star className="mr-1 h-3 w-3 fill-yellow-400 text-yellow-400" />
              {data.rating}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{data.year ?? '—'}</span>
            <span>·</span>
            <span>{data.mediaType === 'tv' ? 'Series' : 'Movie'}</span>
            <span>·</span>
            <span>{genreLabel(data.genreId)}</span>
          </div>
          {data.overview && (
            <p className="text-xs text-muted-foreground line-clamp-4">{data.overview}</p>
          )}
          {data.providerKeys.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Watch on
              </div>
              <StreamingBadges keys={data.providerKeys} limit={7} linkTitle={data.title} />
            </div>
          )}
          {data.watchLink && (
            <a
              href={data.watchLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 pt-1 text-[11px] font-medium text-primary hover:underline"
            >
              View all watch options
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <div className="pt-2 text-[11px] text-muted-foreground">
            Click the card to recenter the graph on this title.
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export const MovieNode = memo(MovieNodeBase)
