import { useEffect } from 'react'
import { GraphProvider } from '@/state/graphStore'
import { GraphCanvas } from '@/graph/GraphCanvas'
import { TopBar } from '@/components/TopBar'
import { FilterSheet } from '@/components/FilterSheet'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { focusSearch, openFilters } from '@/lib/searchBus'

function isTypingTarget(el) {
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
}

function useGlobalShortcuts() {
  useEffect(() => {
    function onKey(e) {
      // Cmd/Ctrl+K works even inside inputs; '/' and 'f' do not.
      const cmdK = (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')
      if (cmdK) {
        e.preventDefault()
        focusSearch()
        return
      }
      if (isTypingTarget(e.target)) return
      if (e.key === '/') {
        e.preventDefault()
        focusSearch()
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        openFilters()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
}

export default function App() {
  useGlobalShortcuts()
  return (
    <GraphProvider>
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background">
        <TopBar />
        <Breadcrumbs />
        <main className="relative flex-1">
          <GraphCanvas />
          <FilterSheet />
        </main>
      </div>
    </GraphProvider>
  )
}
