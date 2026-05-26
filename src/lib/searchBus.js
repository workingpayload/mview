// Tiny module-level pub/sub so global keyboard shortcuts (in App.jsx) can
// command the SearchCommand input without prop-drilling a ref through context.

let focusFn = null
let openFiltersFn = null

export function registerFocusSearch(fn) {
  focusFn = fn ?? null
}
export function focusSearch() {
  focusFn?.()
}

export function registerOpenFilters(fn) {
  openFiltersFn = fn ?? null
}
export function openFilters() {
  openFiltersFn?.()
}
