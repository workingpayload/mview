import { useCallback, useEffect, useRef, useState } from 'react'
import { Film, Tv, Loader2, Clock, Flame, X } from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { searchMulti, getTrending, imgUrl, title, year } from '@/api/tmdb'
import { useGraph } from '@/state/graphStore'
import { getRecents, pushRecent, clearRecents } from '@/lib/recents'
import { registerFocusSearch } from '@/lib/searchBus'

function ResultRow({ r, onSelect }) {
  return (
    <CommandItem
      key={`${r.media_type}-${r.id}`}
      value={`${r.media_type}-${r.id}-${title(r)}`}
      onSelect={() => onSelect(r)}
      className="gap-3"
    >
      <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded bg-muted">
        {r.poster_path ? (
          <img src={imgUrl(r.poster_path, 'w92')} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            {r.media_type === 'tv' ? <Tv className="h-3 w-3" /> : <Film className="h-3 w-3" />}
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{title(r)}</span>
        <span className="text-[11px] text-muted-foreground">
          {(year(r) ?? '—') + ' · ' + (r.media_type === 'tv' ? 'Series' : 'Movie')}
          {r.vote_average ? ` · ★ ${r.vote_average.toFixed(1)}` : ''}
        </span>
      </div>
    </CommandItem>
  )
}

export function SearchCommand() {
  const { focusItem } = useGraph()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [recents, setRecents] = useState(() => getRecents())
  const [trending, setTrending] = useState([])
  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const reqRef = useRef(0)

  // Expose focus to the global keyboard-shortcut handler.
  useEffect(() => {
    registerFocusSearch(() => {
      inputRef.current?.focus()
      inputRef.current?.select?.()
      setOpen(true)
    })
    return () => registerFocusSearch(null)
  }, [])

  // Fetch trending once for the empty-state list inside the dropdown.
  useEffect(() => {
    let cancelled = false
    getTrending().then((r) => {
      if (!cancelled) setTrending(r.slice(0, 8))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!query) {
      setResults([])
      setLoading(false)
      return
    }
    const myReq = ++reqRef.current
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const r = await searchMulti(query)
        if (myReq !== reqRef.current) return
        setResults(r.slice(0, 10))
      } catch {
        if (myReq !== reqRef.current) return
        setResults([])
      } finally {
        if (myReq === reqRef.current) setLoading(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    function onDoc(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        if (query) {
          setQuery('')
        } else {
          inputRef.current?.blur()
          setOpen(false)
        }
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [query])

  const choose = useCallback(
    (item) => {
      setOpen(false)
      setQuery('')
      setResults([])
      pushRecent(item)
      setRecents(getRecents())
      focusItem(item)
    },
    [focusItem],
  )

  const onClearRecents = (e) => {
    e.stopPropagation()
    clearRecents()
    setRecents([])
  }

  const showEmptyMenu = open && !query && !loading
  const showSearchResults = open && (query || loading)

  return (
    <div ref={wrapRef} className="relative w-full sm:max-w-xl">
      <Command shouldFilter={false} className="overflow-visible bg-transparent">
        <div className="rounded-lg border bg-background shadow-sm">
          <CommandInput
            ref={inputRef}
            placeholder="Search a movie or series…  ( / )"
            value={query}
            onValueChange={(v) => {
              setQuery(v)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            className="text-sm"
          />
        </div>
        {(showSearchResults || showEmptyMenu) && (
          <div className="absolute left-0 right-0 top-full z-40 mt-2 rounded-lg border bg-popover shadow-xl">
            <CommandList className="max-h-[460px]">
              {loading && (
                <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Searching…
                </div>
              )}
              {!loading && showSearchResults && results.length === 0 && query && (
                <CommandEmpty>No matches for &ldquo;{query}&rdquo;.</CommandEmpty>
              )}
              {!loading && results.length > 0 && (
                <CommandGroup heading="Top matches">
                  {results.map((r) => (
                    <ResultRow key={`${r.media_type}-${r.id}`} r={r} onSelect={choose} />
                  ))}
                </CommandGroup>
              )}
              {showEmptyMenu && recents.length > 0 && (
                <CommandGroup
                  heading={
                    <div className="flex items-center justify-between pr-2">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        Recent
                      </span>
                      <button
                        onClick={onClearRecents}
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <X className="h-2.5 w-2.5" /> clear
                      </button>
                    </div>
                  }
                >
                  {recents.map((r) => (
                    <ResultRow key={`recent-${r.media_type}-${r.id}`} r={r} onSelect={choose} />
                  ))}
                </CommandGroup>
              )}
              {showEmptyMenu && trending.length > 0 && (
                <CommandGroup
                  heading={
                    <span className="inline-flex items-center gap-1.5">
                      <Flame className="h-3 w-3" />
                      Trending this week
                    </span>
                  }
                >
                  {trending.map((r) => (
                    <ResultRow key={`trend-${r.media_type}-${r.id}`} r={r} onSelect={choose} />
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </div>
        )}
      </Command>
    </div>
  )
}
