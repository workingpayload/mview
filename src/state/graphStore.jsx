import React, { createContext, useContext, useReducer, useCallback, useMemo, useRef, useEffect } from 'react'
import { getDetails, getRecommendations, getCredits, getWatchProviders, title, year } from '@/api/tmdb'
import { pickConnectionReason } from '@/graph/connectionReason'
import { buildEdge } from '@/graph/edges'
import { placeAroundNode, radialLayout } from '@/graph/layout'
import { primaryGenreId } from '@/lib/genres'
import { activePlatformsForItem } from '@/lib/providers'
import { detectRegion, defaultLanguageForRegion } from '@/lib/region'

const GraphCtx = createContext(null)

const _initialRegion = detectRegion()
const DEFAULT_FILTERS = {
  platforms: [], // empty = all
  genreIds: [],
  yearRange: [1970, new Date().getFullYear()],
  minRating: 0,
  contentType: 'both', // 'movie' | 'tv' | 'both'
  language: defaultLanguageForRegion(_initialRegion), // 'any' for English regions; 'hi' for IN, etc.
  maturity: 'any', // 'family' | 'teen' | 'adult' | 'any'
  region: _initialRegion, // ISO 3166-1 alpha-2 country code
}

const initialState = {
  nodes: [],
  edges: [],
  centerId: null,
  visited: new Set(),
  loading: false,
  error: null,
  filters: DEFAULT_FILTERS,
  crumbs: [], // ordered history of centered titles { id, tmdbId, mediaType, title, posterPath, year }
}

const CRUMB_LIMIT = 8

function pushCrumb(crumbs, c) {
  if (!c?.id) return crumbs
  const filtered = crumbs.filter((x) => x.id !== c.id)
  filtered.push(c)
  return filtered.slice(-CRUMB_LIMIT)
}

function crumbFromNode(node) {
  if (!node) return null
  return {
    id: node.id,
    tmdbId: node.data.tmdbId,
    mediaType: node.data.mediaType,
    title: node.data.title,
    posterPath: node.data.posterPath,
    year: node.data.year,
  }
}

function nodeId(mediaType, id) {
  return `${mediaType}-${id}`
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.value, error: action.value ? null : state.error }
    case 'SET_ERROR':
      return { ...state, loading: false, error: action.error }
    case 'RESET_TO_CENTER': {
      const { node, edges = [], recs } = action
      return {
        ...state,
        nodes: [node, ...recs],
        edges,
        centerId: node.id,
        visited: new Set([node.id]),
        loading: false,
        error: null,
        crumbs: pushCrumb(state.crumbs, crumbFromNode(node)),
      }
    }
    case 'EXPAND': {
      const { fromId, newNodes, newEdges } = action
      const existingIds = new Set(state.nodes.map((n) => n.id))
      const appendedNodes = newNodes.filter((n) => !existingIds.has(n.id))
      const existingEdgeIds = new Set(state.edges.map((e) => e.id))
      const appendedEdges = newEdges.filter((e) => !existingEdgeIds.has(e.id))
      const visited = new Set(state.visited)
      visited.add(fromId)
      const nodes = state.nodes
        .map((n) => (n.id === fromId ? markCentered(n, true) : markCentered(n, false)))
        .concat(appendedNodes)
      const expandedNode = nodes.find((n) => n.id === fromId)
      return {
        ...state,
        nodes,
        edges: [...state.edges, ...appendedEdges],
        centerId: fromId,
        visited,
        loading: false,
        crumbs: pushCrumb(state.crumbs, crumbFromNode(expandedNode)),
      }
    }
    case 'UPDATE_NODE_DATA': {
      const { nodeId: targetId, data } = action
      return {
        ...state,
        nodes: state.nodes.map((n) => (n.id === targetId ? { ...n, data: { ...n.data, ...data } } : n)),
      }
    }
    case 'SET_NODES':
      return { ...state, nodes: action.nodes }
    case 'SET_EDGES':
      return { ...state, edges: action.edges }
    case 'SET_FILTER':
      return { ...state, filters: { ...state.filters, [action.key]: action.value } }
    case 'RESET_FILTERS':
      return { ...state, filters: { ...DEFAULT_FILTERS, region: state.filters.region } }
    default:
      return state
  }
}

// Round-robin merge that preserves relative ordering within each list and
// dedupes by id. Used to blend TMDB recommendations with regional-language
// discover results so the user sees both flavours in the top of the rec list.
// Genre-only recommendation filter. Keeps items from TMDB's /recommendations
// + /similar that share at least one genre with the center title. Everything
// else is dropped. This is the entire recommendation policy now — no keyword
// subject matching, no language augmentation, no popularity backfill.
function filterByGenre(recs, centerGenreIds) {
  if (!centerGenreIds?.length) return recs
  const centerSet = new Set(centerGenreIds)
  return recs.filter((r) => {
    const recGenres = r.genre_ids ?? []
    return recGenres.some((g) => centerSet.has(g))
  })
}

function markCentered(node, isCenter) {
  if (node.data?.isCenter === isCenter) return node
  return { ...node, data: { ...node.data, isCenter } }
}

function buildNode({ item, mediaType, position, isCenter, providers = [], watchLink = null, details = null }) {
  const id = nodeId(mediaType, item.id)
  return {
    id,
    type: 'movie',
    position,
    data: {
      tmdbId: item.id,
      mediaType,
      title: title(item),
      year: year(item),
      rating: (item.vote_average ?? details?.vote_average ?? 0).toFixed(1),
      posterPath: item.poster_path,
      backdropPath: item.backdrop_path,
      overview: item.overview ?? details?.overview ?? '',
      genreId: primaryGenreId(item) ?? primaryGenreId(details),
      genreIds: item.genre_ids ?? details?.genres?.map((g) => g.id) ?? [],
      providers,
      providerKeys: activePlatformsForItem(providers),
      watchLink,
      isCenter: !!isCenter,
      visited: false,
    },
  }
}

export function GraphProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Refs so in-flight fetchers (focusItem / expandFromNode) always pick up the
  // latest region/language without forcing them through useCallback deps.
  const regionRef = useRef(state.filters.region)
  const langRef = useRef(state.filters.language)
  useEffect(() => {
    regionRef.current = state.filters.region
  }, [state.filters.region])
  useEffect(() => {
    langRef.current = state.filters.language
  }, [state.filters.language])

  const setFilter = useCallback((key, value) => dispatch({ type: 'SET_FILTER', key, value }), [])
  const resetFilters = useCallback(() => dispatch({ type: 'RESET_FILTERS' }), [])

  // Changing region refetches providers for every node currently on the canvas
  // (in parallel) and patches their providerKeys + watchLink. It also pushes
  // the new region's preferred language so future recs surface local content.
  const setRegion = useCallback(
    async (newRegion) => {
      if (!newRegion || newRegion === regionRef.current) return
      dispatch({ type: 'SET_FILTER', key: 'region', value: newRegion })
      const newLang = defaultLanguageForRegion(newRegion)
      if (newLang !== langRef.current) {
        dispatch({ type: 'SET_FILTER', key: 'language', value: newLang })
      }
      const snapshot = state.nodes
      await Promise.all(
        snapshot.map(async (n) => {
          try {
            const { providers, link } = await getWatchProviders(
              n.data.mediaType,
              n.data.tmdbId,
              newRegion,
            )
            dispatch({
              type: 'UPDATE_NODE_DATA',
              nodeId: n.id,
              data: {
                providers,
                providerKeys: activePlatformsForItem(providers),
                watchLink: link,
              },
            })
          } catch {
            /* per-node failure shouldn't abort the rest */
          }
        }),
      )
    },
    [state.nodes],
  )

  const focusItem = useCallback(async (item) => {
    const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie')
    dispatch({ type: 'SET_LOADING', value: true })
    try {
      const [details, credits, centerWatch, baseRecs] = await Promise.all([
        getDetails(mediaType, item.id),
        getCredits(mediaType, item.id),
        getWatchProviders(mediaType, item.id, regionRef.current).catch(() => ({ providers: [], link: null })),
        getRecommendations(mediaType, item.id),
      ])
      // Recommendation policy: keep only items sharing at least one genre
      // with the centre. No subject/keyword/language augmentation.
      const centerGenreIds = (details?.genres ?? []).map((g) => g.id)
      const recs = filterByGenre(baseRecs, centerGenreIds)
      const centerPos = { x: 0, y: 0 }
      const centerNode = buildNode({
        item: { ...item, ...details },
        mediaType,
        position: centerPos,
        isCenter: true,
        providers: centerWatch.providers,
        watchLink: centerWatch.link,
        details,
      })
      const positions = radialLayout({ centerX: 0, centerY: 0, count: Math.min(recs.length, 12) })
      const recPicks = recs.slice(0, 12)
      const recCreditsArr = await Promise.all(
        recPicks.map((r) => getCredits(r.media_type ?? mediaType, r.id).catch(() => null)),
      )
      const recWatchArr = await Promise.all(
        recPicks.map((r) =>
          getWatchProviders(r.media_type ?? mediaType, r.id, regionRef.current).catch(() => ({
            providers: [],
            link: null,
          })),
        ),
      )
      const recNodes = []
      const edges = []
      recPicks.forEach((r, i) => {
        const rMediaType = r.media_type ?? mediaType
        const node = buildNode({
          item: r,
          mediaType: rMediaType,
          position: positions[i],
          isCenter: false,
          providers: recWatchArr[i].providers,
          watchLink: recWatchArr[i].link,
        })
        recNodes.push(node)
        const reason = pickConnectionReason({
          centerDetails: details,
          centerCredits: credits,
          rec: r,
          recCredits: recCreditsArr[i],
        })
        edges.push(buildEdge({ source: centerNode.id, target: node.id, reason }))
      })
      dispatch({ type: 'RESET_TO_CENTER', node: centerNode, edges, recs: recNodes })
    } catch (e) {
      console.error(e)
      dispatch({ type: 'SET_ERROR', error: e?.message ?? 'Failed to load' })
    }
  }, [])

  const expandFromNode = useCallback(
    async (targetNodeId) => {
      const node = state.nodes.find((n) => n.id === targetNodeId)
      if (!node) return
      const { tmdbId, mediaType } = node.data
      dispatch({ type: 'SET_LOADING', value: true })
      dispatch({ type: 'UPDATE_NODE_DATA', nodeId: targetNodeId, data: { expanding: true } })
      try {
        const [details, credits, baseRecs] = await Promise.all([
          getDetails(mediaType, tmdbId),
          getCredits(mediaType, tmdbId),
          getRecommendations(mediaType, tmdbId),
        ])
        const centerGenreIds = (details?.genres ?? []).map((g) => g.id)
        const recs = filterByGenre(baseRecs, centerGenreIds)
        const limit = 8
        const picks = recs.slice(0, limit)
        const recCreditsArr = await Promise.all(
          picks.map((r) => getCredits(r.media_type ?? mediaType, r.id).catch(() => null)),
        )
        const recWatchArr = await Promise.all(
          picks.map((r) =>
            getWatchProviders(r.media_type ?? mediaType, r.id, regionRef.current).catch(() => ({
              providers: [],
              link: null,
            })),
          ),
        )
        const existingNodes = state.nodes
        const positions = placeAroundNode({
          existingNodes,
          centerNode: node,
          count: picks.length,
        })
        const newNodes = []
        const newEdges = []
        picks.forEach((r, i) => {
          const rMediaType = r.media_type ?? mediaType
          const candidateId = nodeId(rMediaType, r.id)
          if (existingNodes.some((n) => n.id === candidateId)) {
            // already on canvas — just add an edge from current center
            const reason = pickConnectionReason({
              centerDetails: details,
              centerCredits: credits,
              rec: r,
              recCredits: recCreditsArr[i],
            })
            newEdges.push(buildEdge({ source: node.id, target: candidateId, reason }))
            return
          }
          const built = buildNode({
            item: r,
            mediaType: rMediaType,
            position: positions[i],
            isCenter: false,
            providers: recWatchArr[i].providers,
            watchLink: recWatchArr[i].link,
          })
          newNodes.push(built)
          const reason = pickConnectionReason({
            centerDetails: details,
            centerCredits: credits,
            rec: r,
            recCredits: recCreditsArr[i],
          })
          newEdges.push(buildEdge({ source: node.id, target: built.id, reason }))
        })
        dispatch({ type: 'EXPAND', fromId: node.id, newNodes, newEdges })
      } catch (e) {
        console.error(e)
        dispatch({ type: 'SET_ERROR', error: e?.message ?? 'Failed to expand' })
      } finally {
        dispatch({ type: 'UPDATE_NODE_DATA', nodeId: targetNodeId, data: { expanding: false } })
      }
    },
    [state.nodes],
  )

  const setNodes = useCallback((updater) => {
    if (typeof updater === 'function') {
      dispatch({ type: 'SET_NODES', nodes: updater(state.nodes) })
    } else {
      dispatch({ type: 'SET_NODES', nodes: updater })
    }
  }, [state.nodes])

  const setEdges = useCallback((updater) => {
    if (typeof updater === 'function') {
      dispatch({ type: 'SET_EDGES', edges: updater(state.edges) })
    } else {
      dispatch({ type: 'SET_EDGES', edges: updater })
    }
  }, [state.edges])

  // Derived: visible nodes/edges after filter application.
  const visible = useMemo(() => filterGraph(state), [state])

  const value = useMemo(
    () => ({
      ...state,
      ...visible,
      setFilter,
      resetFilters,
      setRegion,
      focusItem,
      expandFromNode,
      setNodes,
      setEdges,
    }),
    [state, visible, setFilter, resetFilters, setRegion, focusItem, expandFromNode, setNodes, setEdges],
  )

  return <GraphCtx.Provider value={value}>{children}</GraphCtx.Provider>
}

function filterGraph(state) {
  const { nodes, edges, filters, centerId } = state
  const matches = (n) => {
    if (n.id === centerId) return true
    const d = n.data
    if (filters.contentType !== 'both' && d.mediaType !== filters.contentType) return false
    if (filters.genreIds.length && !d.genreIds.some((g) => filters.genreIds.includes(g))) return false
    if (filters.platforms.length && !d.providerKeys.some((p) => filters.platforms.includes(p))) return false
    if (d.year) {
      const y = Number(d.year)
      if (y < filters.yearRange[0] || y > filters.yearRange[1]) return false
    }
    if (filters.minRating && Number(d.rating) < filters.minRating) return false
    return true
  }
  const visibleNodes = nodes.filter(matches)
  const visibleIds = new Set(visibleNodes.map((n) => n.id))
  const visibleEdges = edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
  return { visibleNodes, visibleEdges }
}

export function useGraph() {
  const ctx = useContext(GraphCtx)
  if (!ctx) throw new Error('useGraph must be used inside GraphProvider')
  return ctx
}
