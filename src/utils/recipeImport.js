import { UNIT_DEFS } from './units.js'
import { titleCase } from './format.js'

// Map common spoken unit words to our canonical unit keys.
const UNIT_ALIASES = {
  g: 'g', gram: 'g', grams: 'g', gr: 'g',
  kg: 'kg', kilogram: 'kg', kilograms: 'kg',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  ml: 'ml', milliliter: 'ml', millilitre: 'ml', milliliters: 'ml',
  l: 'l', liter: 'l', litre: 'l', liters: 'l',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp', t: 'tsp',
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp', tbsps: 'tbsp', tbs: 'tbsp', T: 'tbsp',
  cup: 'cup', cups: 'cup', c: 'cup',
  floz: 'floz', 'fl oz': 'floz',
  pint: 'pint', pints: 'pint',
  clove: 'clove', cloves: 'clove',
  pinch: 'pinch', pinches: 'pinch',
  dozen: 'dozen',
}

const FRACTIONS = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 }

function parseNumberToken(tok) {
  if (FRACTIONS[tok] != null) return FRACTIONS[tok]
  if (/^\d+\/\d+$/.test(tok)) {
    const [a, b] = tok.split('/').map(Number)
    return a / b
  }
  const n = parseFloat(tok)
  return isNaN(n) ? null : n
}

// Best-effort parse of a free-text ingredient line e.g. "2 1/2 cups bread flour".
export function parseIngredientLine(raw) {
  let text = String(raw).trim().replace(/\s+/g, ' ')
  if (!text) return null
  const tokens = text.split(' ')
  let quantity = 0
  let i = 0
  // Accumulate leading numeric/fraction tokens (handles "1 1/2", "2½").
  while (i < tokens.length) {
    const lead = FRACTIONS[tokens[i]?.[0]] != null && tokens[i].length === 1
    const val = parseNumberToken(tokens[i])
    if (val != null) {
      quantity += val
      i++
    } else if (lead) {
      quantity += FRACTIONS[tokens[i]]
      i++
    } else break
  }
  let unit = 'each'
  const maybeUnit = tokens[i]?.toLowerCase().replace(/\.$/, '')
  if (maybeUnit && UNIT_ALIASES[maybeUnit]) {
    unit = UNIT_ALIASES[maybeUnit]
    i++
  }
  const name = tokens.slice(i).join(' ').replace(/^of\s+/i, '').trim()
  return {
    quantity: quantity || 1,
    unit: UNIT_DEFS[unit] ? unit : 'each',
    name: titleCase(name || text),
    raw: text,
  }
}

function asArray(x) {
  return Array.isArray(x) ? x : x == null ? [] : [x]
}

function parseYield(y) {
  const arr = asArray(y)
  for (const v of arr) {
    const m = String(v).match(/\d+/)
    if (m) return parseInt(m[0], 10)
  }
  return 4
}

function flattenInstructions(ins) {
  const out = []
  for (const step of asArray(ins)) {
    if (typeof step === 'string') out.push(step)
    else if (step?.text) out.push(step.text)
    else if (step?.itemListElement) out.push(...flattenInstructions(step.itemListElement))
  }
  return out
}

// Find a schema.org Recipe object anywhere in parsed JSON-LD.
function findRecipeNode(data) {
  const stack = asArray(data)
  while (stack.length) {
    const node = stack.shift()
    if (!node || typeof node !== 'object') continue
    const type = asArray(node['@type']).map((t) => String(t).toLowerCase())
    if (type.includes('recipe')) return node
    if (node['@graph']) stack.push(...asArray(node['@graph']))
  }
  return null
}

function numFrom(s) {
  const m = String(s ?? '').match(/-?[\d.]+/)
  return m ? parseFloat(m[0]) : null
}

// schema.org NutritionInformation → our per-serving nutrition keys.
function parseNutrition(nut) {
  if (!nut || typeof nut !== 'object') return null
  const map = {
    calories: 'calories', proteinContent: 'protein', carbohydrateContent: 'carbs', fatContent: 'fat',
    fiberContent: 'fiber', sugarContent: 'sugar', sodiumContent: 'sodium',
  }
  const out = {}
  for (const [k, key] of Object.entries(map)) {
    const v = numFrom(nut[k])
    if (v != null) out[key] = v
  }
  return Object.keys(out).length ? out : null
}

export function normalizeRecipeNode(node) {
  if (!node) return null
  const img = node.image
  const image = typeof img === 'string' ? img : asArray(img)[0]?.url || asArray(img)[0] || ''
  return {
    title: node.name || 'Imported recipe',
    image: typeof image === 'string' ? image : '',
    servings: parseYield(node.recipeYield),
    instructions: flattenInstructions(node.recipeInstructions),
    ingredientLines: asArray(node.recipeIngredient).map(String),
    nutrition: parseNutrition(node.nutrition),
    sourceUrl: node.url || '',
    tags: [
      ...asArray(node.recipeCuisine),
      ...asArray(node.recipeCategory),
      ...asArray(node.keywords).join(',').split(',').map((s) => s.trim()),
    ].filter(Boolean),
  }
}

// Pull a <meta> tag's content regardless of attribute order.
function metaContent(html, key) {
  const tag = html.match(new RegExp('<meta[^>]+(?:property|name)=["\']' + key + '["\'][^>]*>', 'i'))?.[0]
  return tag ? (tag.match(/content=["']([^"']*)["']/i)?.[1] || '') : ''
}

// Scrape Open Graph / page-level fallbacks (title + hero image) from raw HTML.
function scrapeOpenGraph(html) {
  const title = metaContent(html, 'og:title') || (html.match(/<title[^>]*>([^<]+)</i)?.[1] || '').trim()
  const image = metaContent(html, 'og:image') || metaContent(html, 'twitter:image')
  return { title: title.replace(/\s+/g, ' ').trim(), image }
}

// Parse pasted JSON-LD or a full HTML page. Always returns the best it can so
// the user can review/edit before saving — scrapes the page image as a fallback.
export function parseRecipeText(text) {
  const trimmed = text.trim()
  let recipe = null

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try { recipe = normalizeRecipeNode(findRecipeNode(JSON.parse(trimmed))) } catch { /* fall through */ }
  }
  if (!recipe) {
    const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    let m
    while ((m = re.exec(text))) {
      try {
        const node = findRecipeNode(JSON.parse(m[1].trim()))
        if (node) { recipe = normalizeRecipeNode(node); break }
      } catch { /* try next block */ }
    }
  }

  // For HTML, scrape the hero image / title as a fallback or to fill gaps.
  if (/<[a-z!][\s\S]*>/i.test(trimmed)) {
    const og = scrapeOpenGraph(text)
    if (recipe) {
      if (!recipe.image && og.image) recipe.image = og.image
    } else if (og.title || og.image) {
      recipe = { title: og.title || 'Imported recipe', image: og.image || '', servings: 4, instructions: [], ingredientLines: [], sourceUrl: '', tags: [], partial: true }
    }
  }
  return recipe
}

// Several open proxies — many recipe sites 403 scrapers, so we try in order
// and use the first that returns usable markup. `json` ones wrap HTML in JSON.
const PROXY_STRATEGIES = [
  { make: (u) => u }, // direct first — works same-origin and on CORS-friendly sites
  { make: (u) => 'https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent(u) },
  { make: (u) => 'https://api.allorigins.win/get?url=' + encodeURIComponent(u), pick: (t) => { try { return JSON.parse(t).contents } catch { return t } } },
  { make: (u) => 'https://corsproxy.io/?url=' + encodeURIComponent(u) },
  { make: (u) => 'https://thingproxy.freeboard.io/fetch/' + u },
  { make: (u) => 'https://r.jina.ai/' + u }, // returns readable text/HTML; last resort
]

// Fetch any page's raw HTML through the proxies (used by the bulk importer to
// read a recipe index page).
export async function fetchPageHtml(url) {
  let lastErr = null
  for (const s of PROXY_STRATEGIES) {
    try {
      const res = await fetch(s.make(url), { headers: { Accept: 'text/html,application/xhtml+xml,*/*' } })
      if (!res.ok) { lastErr = new Error('status ' + res.status); continue }
      let body = await res.text()
      if (s.pick) body = s.pick(body)
      if (body && /<[a-z!][\s\S]*>/i.test(body)) return body
      lastErr = new Error('empty page')
    } catch (e) { lastErr = e }
  }
  throw new Error('Could not fetch that page (' + (lastErr?.message || 'blocked') + ').')
}

// Fetch a recipe URL through a public CORS proxy, then parse it. Uses open
// proxies (no API key); falls back to the next proxy if one fails.
export async function fetchRecipeFromUrl(url) {
  let lastErr = null
  for (const s of PROXY_STRATEGIES) {
    try {
      const res = await fetch(s.make(url), { headers: { Accept: 'text/html,application/xhtml+xml,*/*' } })
      if (!res.ok) { lastErr = new Error('status ' + res.status); continue }
      let body = await res.text()
      if (s.pick) body = s.pick(body)
      if (!body) continue
      const recipe = parseRecipeText(body)
      if (recipe) { recipe.sourceUrl = recipe.sourceUrl || url; return recipe }
      lastErr = new Error('no recipe data')
    } catch (e) { lastErr = e }
  }
  throw new Error(
    'Could not import from that URL (' + (lastErr?.message || 'blocked') + '). ' +
    'Many sites block scrapers — paste the page source or the recipe JSON below instead.',
  )
}
