import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { SearchCommand } from '@/components/SearchCommand'
import { PLATFORMS } from '@/lib/providers'
import { useGraph } from '@/state/graphStore'
import { Sparkles } from 'lucide-react'

export function TopBar() {
  const { filters, setFilter } = useGraph()
  return (
    <header className="relative z-30 flex items-center gap-2 border-b border-border/60 bg-background/80 px-3 py-2.5 backdrop-blur sm:gap-4 sm:px-4 sm:py-3">
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="hidden md:block">
          <div className="text-sm font-semibold leading-none">mview</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">recommendation graph</div>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <SearchCommand />
      </div>
      <TooltipProvider delayDuration={200}>
        <div className="hidden lg:block">
          <ToggleGroup
            type="multiple"
            value={filters.platforms}
            onValueChange={(v) => setFilter('platforms', v)}
            variant="outline"
            size="sm"
          >
            {PLATFORMS.map((p) => (
              <Tooltip key={p.key}>
                <TooltipTrigger asChild>
                  <ToggleGroupItem value={p.key} aria-label={p.label} className="px-2 text-[11px] font-semibold">
                    {p.short}
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>{p.label}</TooltipContent>
              </Tooltip>
            ))}
          </ToggleGroup>
        </div>
      </TooltipProvider>
    </header>
  )
}
