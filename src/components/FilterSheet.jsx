import { useEffect, useState } from 'react'
import { registerOpenFilters } from '@/lib/searchBus'
import { SlidersHorizontal, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ALL_GENRE_OPTIONS, genreColor } from '@/lib/genres'
import { PLATFORMS } from '@/lib/providers'
import { getRegionChoices, regionFlag, currentTimezone } from '@/lib/region'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useGraph } from '@/state/graphStore'
import { cn } from '@/lib/utils'

const CURRENT_YEAR = new Date().getFullYear()

const LANGUAGES = [
  { value: 'any', label: 'Any (default)' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'ml', label: 'Malayalam' },
  { value: 'kn', label: 'Kannada' },
  { value: 'bn', label: 'Bengali' },
  { value: 'mr', label: 'Marathi' },
  { value: 'pa', label: 'Punjabi' },
  { value: 'gu', label: 'Gujarati' },
  { value: 'ur', label: 'Urdu' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'nl', label: 'Dutch' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ru', label: 'Russian' },
  { value: 'ar', label: 'Arabic' },
  { value: 'tr', label: 'Turkish' },
  { value: 'id', label: 'Indonesian' },
  { value: 'vi', label: 'Vietnamese' },
  { value: 'th', label: 'Thai' },
  { value: 'he', label: 'Hebrew' },
  { value: 'pl', label: 'Polish' },
  { value: 'sv', label: 'Swedish' },
]

const MATURITY = [
  { value: 'any', label: 'Any' },
  { value: 'family', label: 'Family' },
  { value: 'teen', label: 'Teen' },
  { value: 'adult', label: 'Mature' },
]

const { detected: DETECTED_REGION, options: REGION_CHOICES } = getRegionChoices()
const TZ_LABEL = currentTimezone()

export function FilterSheet() {
  const { filters, setFilter, resetFilters, setRegion } = useGraph()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    registerOpenFilters(() => setOpen(true))
    return () => registerOpenFilters(null)
  }, [])

  const toggleGenre = (id) => {
    const has = filters.genreIds.includes(id)
    setFilter('genreIds', has ? filters.genreIds.filter((g) => g !== id) : [...filters.genreIds, id])
  }

  const activeCount =
    (filters.platforms.length > 0 ? 1 : 0) +
    (filters.genreIds.length > 0 ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.contentType !== 'both' ? 1 : 0) +
    (filters.language !== 'any' ? 1 : 0) +
    (filters.maturity !== 'any' ? 1 : 0) +
    (filters.yearRange[0] !== 1970 || filters.yearRange[1] !== CURRENT_YEAR ? 1 : 0)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="absolute left-3 top-3 z-20 h-9 gap-1.5 px-2.5 shadow-md backdrop-blur sm:left-4 sm:top-4 sm:gap-2 sm:px-3"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeCount > 0 && (
            <Badge className="ml-0.5 h-5 min-w-[20px] justify-center px-1.5 text-[10px]" variant="default">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[88vw] max-w-[380px] p-0 sm:w-[380px]">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader className="mb-4">
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>
                Narrow the recommendation graph. Filters hide nodes locally — they don't re-query TMDB.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6">
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Content type</h4>
                </div>
                <Tabs value={filters.contentType} onValueChange={(v) => setFilter('contentType', v)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="movie">Movies</TabsTrigger>
                    <TabsTrigger value="tv">Series</TabsTrigger>
                    <TabsTrigger value="both">Both</TabsTrigger>
                  </TabsList>
                </Tabs>
              </section>

              <Separator />

              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Region</h4>
                  {filters.region !== DETECTED_REGION && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setRegion(DETECTED_REGION)}
                    >
                      Use detected
                    </Button>
                  )}
                </div>
                <Select value={filters.region} onValueChange={(v) => setRegion(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      <span className="inline-flex items-center gap-2">
                        <span className="text-base leading-none">{regionFlag(filters.region)}</span>
                        <span>
                          {REGION_CHOICES.find((r) => r.code === filters.region)?.name ?? filters.region}
                        </span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[60vh]">
                    {REGION_CHOICES.map((r) => (
                      <SelectItem key={r.code} value={r.code}>
                        <span className="inline-flex items-center gap-2">
                          <span className="text-base leading-none">{r.flag}</span>
                          <span>{r.name}</span>
                          {r.code === DETECTED_REGION && (
                            <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                              detected
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  Streaming availability is region-specific.
                  {TZ_LABEL ? ` Auto-detected from ${TZ_LABEL}.` : ''}
                </p>
              </section>

              <Separator />

              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Streaming</h4>
                  {filters.platforms.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setFilter('platforms', [])}>
                      Clear
                    </Button>
                  )}
                </div>
                <ToggleGroup
                  type="multiple"
                  value={filters.platforms}
                  onValueChange={(v) => setFilter('platforms', v)}
                  variant="outline"
                  size="sm"
                  className="flex flex-wrap justify-start gap-1.5"
                >
                  {PLATFORMS.map((p) => (
                    <ToggleGroupItem
                      key={p.key}
                      value={p.key}
                      aria-label={p.label}
                      className="h-8 px-2.5 text-[11px] font-medium"
                    >
                      <span className="font-bold">{p.short}</span>
                      <span className="ml-1.5 hidden xs:inline sm:inline">{p.label}</span>
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </section>

              <Separator />

              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Genres</h4>
                  {filters.genreIds.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setFilter('genreIds', [])}>
                      Clear
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_GENRE_OPTIONS.map((g) => {
                    const selected = filters.genreIds.includes(g.id)
                    return (
                      <button
                        key={g.id}
                        onClick={() => toggleGenre(g.id)}
                        className={cn(
                          'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition',
                          selected
                            ? 'border-transparent text-black'
                            : 'border-border bg-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                        )}
                        style={
                          selected
                            ? { background: genreColor(g.id, 60, 70, 1) }
                            : { borderColor: genreColor(g.id, 55, 50, 0.4), color: genreColor(g.id, 70, 60, 1) }
                        }
                      >
                        {g.name}
                      </button>
                    )
                  })}
                </div>
              </section>

              <Separator />

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Year range</h4>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {filters.yearRange[0]} – {filters.yearRange[1]}
                  </span>
                </div>
                <Slider
                  value={filters.yearRange}
                  min={1920}
                  max={CURRENT_YEAR}
                  step={1}
                  onValueChange={(v) => setFilter('yearRange', v)}
                />
              </section>

              <Separator />

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Minimum rating</h4>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {filters.minRating.toFixed(1)} ★
                  </span>
                </div>
                <Slider
                  value={[filters.minRating]}
                  min={0}
                  max={10}
                  step={0.1}
                  onValueChange={(v) => setFilter('minRating', v[0])}
                />
              </section>

              <Separator />

              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Boost language</h4>
                <Select value={filters.language} onValueChange={(v) => setFilter('language', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[55vh]">
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  Mixes popular titles in this original language into recommendations — useful when TMDB's defaults skew too Hollywood.
                </p>
              </section>

              <Separator />

              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Maturity</h4>
                <Select value={filters.maturity} onValueChange={(v) => setFilter('maturity', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATURITY.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </section>

              <Separator />

              <Button variant="ghost" size="sm" className="w-full gap-2" onClick={resetFilters}>
                <RotateCcw className="h-3.5 w-3.5" />
                Reset all filters
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
