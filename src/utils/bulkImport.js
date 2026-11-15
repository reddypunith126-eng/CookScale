import { create } from 'zustand'
import { useStore } from '../store.js'
import { fetchPageHtml, fetchRecipeFromUrl, parseIngredientLine } from './recipeImport.js'
import { findExistingRecipe } from './dedupe.js'
import { unitCategory } from './units.js'

// ---------------------------------------------------------------------------
// Bulk importer. Job state lives in a module-level (non-persisted) store and
// the runner is a plain async loop, so imports keep going while the user
// navigates around the app. Only one job can run at a time.
// ---------------------------------------------------------------------------
export const useBulkImport = create((set) => ({
  status: 'idle', // idle | discovering | running | done | cancelled | error
  indexUrl: '',
  error: '',
  items: [], // [{ url, title, status: pending|fetching|ok|error, recipe, error, selected, duplicate, imported }]

  toggleItem: (url) =>
    set((s) => ({ items: s.items.map((i) => (i.url === url && i.status === 'ok' && !i.imported ? { ...i, selected: !i.selected } : i)) })),
  setAllSelected: (selected) =>
    set((s) => ({ items: s.items.map((i) => (i.status === 'ok' && !i.imported ? { ...i, selected } : i)) })),
}))

const patchItem = (url, patch) =>
  useBulkImport.setState((s) => ({ items: s.items.map((i) => (i.url === url ? { ...i, ...patch } : i)) }))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export function isBulkImportRunning() {
  const st = useBulkImport.getState().status
  return st === 'discovering' || st === 'running'
}

let cancelToken = null
export function cancelBulkImport() {
  if (cancelToken) cancelToken.cancelled = true
}
export function resetBulkImport() {
  if (isBulkImportRunning()) return
  useBulkImport.setState({ status: 'idle', indexUrl: '', error: '', items: [] })
}

// Pull recipe URLs out of an index page: JSON-LD ItemList first (most recipe
// sites publish one on collection pages), then <a href> heuristics.
export function extractRecipeLinks(html, indexUrl) {
  const base = new URL(indexUrl)
  const seen = new Set()
  const clean = (u) => { u.hash = ''; return u.toString() }

  const fromItemList = []
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m
  while ((m = re.exec(html))) {
    try {
      const stack = [JSON.parse(m[1].trim())]
      while (stack.length) {
        const node = stack.shift()
        if (Array.isArray(node)) { stack.push(...node); continue }
        if (!node || typeof node !== 'object') continue
        const type = String(node['@type'] || '').toLowerCase()
        if (type === 'itemlist') {
          for (const el of [].concat(node.itemListElement || [])) {
            const u = el?.url || el?.item?.url || (typeof el?.item === 'string' ? el.item : null)
            if (u) fromItemList.push(u)
          }
        }
        if (node['@graph']) stack.push(...[].concat(node['@graph']))
      }
    } catch { /* skip bad JSON-LD */ }
  }
  if (fromItemList.length) {
    const urls = []
    for (const h of fromItemList) {
      try {
        const u = clean(new URL(h, base))
        if (!seen.has(u)) { seen.add(u); urls.push(u) }
      } catch { /* skip */ }
    }
    if (urls.length) return urls.slice(0, 50)
  }

  // Fallback: same-host anchors that look like recipe pages.
  const links = []
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["']/gi)) {
    try {
      const u = new URL(match[1], base)
      if (u.host !== base.host) continue
      const url = clean(u)
      if (seen.has(url)) continue
      seen.add(url)
      links.push(u)
    } catch { /* skip */ }
  }
  const basePath = base.pathname.replace(/\/$/, '')
  const notIndex = (u) => u.pathname.replace(/\/$/, '') !== basePath
  const junk = /\/(category|categories|collection|tag|tags|author|about|contact|privacy|terms|shop|cart|login|sign|account|page|search|print|wp-|feed|comment|subscribe|newsletter)\b/i
  let candidates = links.filter((u) => /recipe|recept|rezept/i.test(u.pathname) && notIndex(u) && !junk.test(u.pathname))
  if (!candidates.length) {
    candidates = links.filter((u) => u.pathname.startsWith(basePath + '/') && notIndex(u) && !junk.test(u.pathname))
  }
  return candidates.map(clean).slice(0, 50)
}

// Kick off a bulk import. Returns false when a job is already running.
export async function startBulkImport(indexUrl) {
  if (isBulkImportRunning()) return false
  const token = { cancelled: false }
  cancelToken = token
  useBulkImport.setState({ status: 'discovering', indexUrl, error: '', items: [] })
  try {
    const html = await fetchPageHtml(indexUrl)
    const urls = extractRecipeLinks(html, indexUrl)
    if (!urls.length) throw new Error('No recipe links found on that page. Make sure it\'s an index/collection page with links to individual recipes.')
    useBulkImport.setState({
      status: 'running',
      items: urls.map((url) => ({ url, title: '', status: 'pending', recipe: null, error: '', selected: false, duplicate: false, imported: false })),
    })
    for (const url of urls) {
      if (token.cancelled) break
      patchItem(url, { status: 'fetching' })
      try {
        const recipe = await fetchRecipeFromUrl(url)
        const dup = findExistingRecipe({ title: recipe.title, sourceUrl: recipe.sourceUrl || url }, useStore.getState().recipes)
        patchItem(url, {
          status: 'ok',
          recipe,
          title: recipe.title,
          duplicate: !!dup,
          // Preselect solid imports; leave duplicates and empty shells unchecked.
          selected: !dup && recipe.ingredientLines.length > 0,
        })
      } catch (e) {
        if (!token.cancelled) patchItem(url, { status: 'error', error: e.message })
      }
      await sleep(350) // be polite to the proxies
    }
    useBulkImport.setState({ status: token.cancelled ? 'cancelled' : 'done' })
  } catch (e) {
    useBulkImport.setState({ status: 'error', error: e.message })
  }
  return true
}

// Save one parsed recipe into the library. Ingredient lines run through the
// same dedupe-aware addIngredient used everywhere else, so imports reuse the
// existing pantry vocabulary instead of spawning near-duplicates.
export function importParsedRecipe(data, fallbackUrl = '') {
  const st = useStore.getState()
  const lines = (data.ingredientLines || []).map((raw) => {
    const p = parseIngredientLine(raw)
    const cat = unitCategory(p.unit)
    const baseUnit = cat === 'mass' ? 'g' : cat === 'volume' ? 'ml' : 'each'
    const ingredientId = st.addIngredient({ name: p.name, baseUnit })
    return { ingredientId, quantity: p.quantity, unit: p.unit, note: '' }
  })
  return st.addRecipe({
    title: data.title || 'Imported recipe',
    servings: data.servings || 4,
    image: data.image || '',
    sourceUrl: data.sourceUrl || fallbackUrl,
    nutrition: data.nutrition || null,
    tags: [...new Set((data.tags || []).map((t) => t.toLowerCase()))].slice(0, 12),
    instructions: data.instructions || [],
    ingredients: lines,
  })
}

// Import every selected, successfully-fetched item. Returns how many were saved.
export function importSelected() {
  const { items } = useBulkImport.getState()
  let count = 0
  for (const item of items) {
    if (item.status !== 'ok' || !item.selected || item.imported) continue
    importParsedRecipe(item.recipe, item.url)
    patchItem(item.url, { imported: true, selected: false })
    count++
  }
  return count
}
