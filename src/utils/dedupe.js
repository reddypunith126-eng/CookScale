// Duplicate detection for ingredients and recipes.
// Ingredients with different (non-empty) brands are never considered duplicates.

const STOP_WORDS = new Set(['fresh', 'organic', 'raw', 'whole', 'large', 'small', 'medium'])

export function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function singular(word) {
  if (word.length <= 3) return word
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y'
  if (word.endsWith('oes')) return word.slice(0, -2)
  if (word.endsWith('es') && /(s|x|z|ch|sh)es$/.test(word)) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

function tokens(name) {
  return normalizeName(name).split(' ').filter(Boolean).map(singular)
}

// Character-bigram Dice coefficient — catches typos and word-order changes.
function bigramDice(a, b) {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0
  const grams = (s) => {
    const m = new Map()
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2)
      m.set(g, (m.get(g) || 0) + 1)
    }
    return m
  }
  const ga = grams(a)
  const gb = grams(b)
  let overlap = 0
  for (const [g, n] of ga) overlap += Math.min(n, gb.get(g) || 0)
  return (2 * overlap) / (a.length - 1 + b.length - 1)
}

// 0..1 similarity between two display names.
export function nameSimilarity(a, b) {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  const ta = tokens(a)
  const tb = tokens(b)
  if (ta.join(' ') === tb.join(' ')) return 1
  const sa = new Set(ta.filter((t) => !STOP_WORDS.has(t)))
  const sb = new Set(tb.filter((t) => !STOP_WORDS.has(t)))
  if (sa.size && sb.size && [...sa].join(' ') === [...sb].join(' ')) return 0.95
  let hit = 0
  for (const t of sa) if (sb.has(t)) hit++
  const jaccard = sa.size || sb.size ? hit / (sa.size + sb.size - hit) : 0
  // One name containing all tokens of the other ("flour" vs "bread flour") is a
  // weaker signal than full overlap — usually a variant, sometimes a duplicate.
  const containment = sa.size && sb.size ? hit / Math.min(sa.size, sb.size) : 0
  const dice = bigramDice(na.replace(/\s/g, ''), nb.replace(/\s/g, ''))
  return Math.max(jaccard, dice, containment * 0.82)
}

// Only identical brands (or both unbranded) can be duplicates — a branded
// entry is deliberately distinct from a generic one.
function brandsCompatible(a, b) {
  const ba = String(a?.brand || '').trim().toLowerCase()
  const bb = String(b?.brand || '').trim().toLowerCase()
  return ba === bb
}

export function ingredientsAreDuplicate(a, b, threshold = 0.8) {
  if (!brandsCompatible(a, b)) return false
  return nameSimilarity(a.name, b.name) >= threshold
}

// Union-find clustering over pairwise matches.
function cluster(items, isDup) {
  const parent = items.map((_, i) => i)
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const union = (i, j) => { parent[find(i)] = find(j) }
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (isDup(items[i], items[j])) union(i, j)
    }
  }
  const groups = new Map()
  items.forEach((item, i) => {
    const root = find(i)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root).push(item)
  })
  return [...groups.values()].filter((g) => g.length > 1)
}

// How much data an ingredient carries — richer ones win as merge keeper.
function ingredientRichness(ing, usageCount = 0) {
  const nutrKeys = Object.values(ing.nutritionPer100 || {}).filter((v) => v > 0).length
  return (
    usageCount * 10 +
    nutrKeys * 2 +
    (ing.priceHistory?.length || 0) * 2 +
    (ing.fdcId ? 5 : 0) +
    (ing.packages?.length || 0) +
    (ing.density ? 1 : 0) +
    (ing.servingSize ? 1 : 0)
  )
}

// Returns [{ items: [ingredient...], suggestedKeepId, certain }]
export function findDuplicateIngredients(ingredients, recipes = []) {
  const usage = {}
  for (const r of recipes) {
    for (const line of r.ingredients || []) usage[line.ingredientId] = (usage[line.ingredientId] || 0) + 1
  }
  return cluster(ingredients, (a, b) => ingredientsAreDuplicate(a, b)).map((items) => {
    const sorted = [...items].sort((a, b) => ingredientRichness(b, usage[b.id]) - ingredientRichness(a, usage[a.id]))
    const certain = items.every((a) => items.every((b) => a === b || nameSimilarity(a.name, b.name) >= 0.98))
    return { items: sorted, suggestedKeepId: sorted[0].id, certain, usage }
  })
}

function recipesAreDuplicate(a, b, threshold = 0.85) {
  const ua = String(a.sourceUrl || '').trim().replace(/\/+$/, '').toLowerCase()
  const ub = String(b.sourceUrl || '').trim().replace(/\/+$/, '').toLowerCase()
  if (ua && ua === ub) return true
  return nameSimilarity(a.title, b.title) >= threshold
}

function recipeRichness(r) {
  return (
    (r.ingredients?.length || 0) * 2 +
    (r.instructions?.length || 0) +
    (r.image ? 2 : 0) +
    (r.nutrition ? 3 : 0) +
    (r.rating || 0) +
    (r.favorite ? 3 : 0)
  )
}

export function findDuplicateRecipes(recipes) {
  return cluster(recipes, (a, b) => recipesAreDuplicate(a, b)).map((items) => {
    const sorted = [...items].sort((a, b) => recipeRichness(b) - recipeRichness(a))
    return { items: sorted, suggestedKeepId: sorted[0].id }
  })
}

// Prevention helpers — called on create so duplicates never enter the library.
export function findExistingIngredient(name, brand, ingredients, threshold = 0.93) {
  const probe = { name, brand }
  let best = null
  let bestScore = 0
  for (const ing of ingredients) {
    if (!brandsCompatible(probe, ing)) continue
    const s = nameSimilarity(name, ing.name)
    if (s > bestScore) { bestScore = s; best = ing }
  }
  return bestScore >= threshold ? best : null
}

export function findExistingRecipe(recipe, recipes) {
  return recipes.find((r) => r.id !== recipe.id && recipesAreDuplicate(r, recipe, 0.97)) || null
}
