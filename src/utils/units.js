// Open unit-conversion helpers. Everything reduces to a base unit per category:
//   mass   -> grams (g)
//   volume -> millilitres (ml)
//   count  -> each
export const UNIT_DEFS = {
  // mass
  g: { category: 'mass', toBase: 1, label: 'g' },
  kg: { category: 'mass', toBase: 1000, label: 'kg' },
  oz: { category: 'mass', toBase: 28.3495, label: 'oz' },
  lb: { category: 'mass', toBase: 453.592, label: 'lb' },
  // volume
  ml: { category: 'volume', toBase: 1, label: 'ml' },
  l: { category: 'volume', toBase: 1000, label: 'l' },
  tsp: { category: 'volume', toBase: 4.92892, label: 'tsp' },
  tbsp: { category: 'volume', toBase: 14.7868, label: 'tbsp' },
  cup: { category: 'volume', toBase: 236.588, label: 'cup' },
  floz: { category: 'volume', toBase: 29.5735, label: 'fl oz' },
  pint: { category: 'volume', toBase: 473.176, label: 'pint' },
  // count
  each: { category: 'count', toBase: 1, label: 'each' },
  dozen: { category: 'count', toBase: 12, label: 'dozen' },
  clove: { category: 'count', toBase: 1, label: 'clove' },
  pinch: { category: 'volume', toBase: 0.31, label: 'pinch' },
}

export const BASE_UNITS = ['g', 'ml', 'each']

export const UNITS_BY_CATEGORY = {
  mass: ['g', 'kg', 'oz', 'lb'],
  volume: ['ml', 'l', 'tsp', 'tbsp', 'cup', 'floz', 'pint', 'pinch'],
  count: ['each', 'dozen', 'clove'],
}

export function unitCategory(unit) {
  return UNIT_DEFS[unit]?.category ?? null
}

// Convert qty from one unit to another within the same category. Returns null if incompatible.
export function convert(qty, fromUnit, toUnit) {
  const f = UNIT_DEFS[fromUnit]
  const t = UNIT_DEFS[toUnit]
  if (!f || !t || f.category !== t.category) return null
  return (qty * f.toBase) / t.toBase
}

// Convert to the base unit for the unit's category.
export function toBase(qty, unit) {
  const f = UNIT_DEFS[unit]
  if (!f) return null
  return qty * f.toBase
}

export function unitLabel(unit) {
  return UNIT_DEFS[unit]?.label ?? unit
}

export function compatibleUnits(unit) {
  const cat = unitCategory(unit)
  return cat ? UNITS_BY_CATEGORY[cat] : [unit]
}

// Unicode glyphs for the common cooking fractions.
const FRACTION_GLYPHS = {
  '1/2': '½', '1/3': '⅓', '2/3': '⅔', '1/4': '¼', '3/4': '¾',
  '1/5': '⅕', '2/5': '⅖', '3/5': '⅗', '4/5': '⅘', '1/6': '⅙', '5/6': '⅚',
  '1/8': '⅛', '3/8': '⅜', '5/8': '⅝', '7/8': '⅞',
}

function gcd(a, b) { return b ? gcd(b, a % b) : a }

// Best cooking-fraction approximation of a value in (0,1), denominators up to 64.
function bestFraction(frac) {
  let best = null
  let bestErr = Infinity
  for (const d of [2, 3, 4, 5, 6, 8, 12, 16, 32, 64]) {
    const n = Math.round(frac * d)
    if (n <= 0 || n >= d) continue
    const err = Math.abs(frac - n / d)
    if (err < bestErr - 1e-9) { bestErr = err; best = [n, d] }
  }
  if (!best || bestErr > 0.03) return null
  const g = gcd(best[0], best[1])
  return [best[0] / g, best[1] / g]
}

// Display a quantity as a fraction for volume/count units (½ tsp, 1¾ cups),
// and as a plain number for mass units (where grams are precise).
export function formatQuantity(qty, unit) {
  if (qty == null || isNaN(qty)) return ''
  if (unitCategory(unit) === 'mass') {
    return Number.isInteger(qty) ? String(qty) : qty.toFixed(qty < 10 ? 1 : 0)
  }
  const whole = Math.floor(qty + 1e-9)
  const frac = qty - whole
  if (frac < 1e-6) return String(whole)
  const f = bestFraction(frac)
  if (!f) return Number.isInteger(qty) ? String(qty) : qty.toFixed(2)
  const key = `${f[0]}/${f[1]}`
  const glyph = FRACTION_GLYPHS[key]
  if (glyph) return whole > 0 ? `${whole}${glyph}` : glyph
  return whole > 0 ? `${whole} ${key}` : key
}
