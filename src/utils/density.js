import { toBase, unitCategory } from './units.js'

// Approximate densities (g per ml) for converting volume measurements to grams.
// Matched by ingredient-name keyword when the ingredient has no explicit density.
const DENSITY_BY_NAME = [
  [/\b(water|broth|stock|vinegar)\b/, 1.0],
  [/coconut milk/, 0.99],
  [/\b(milk|buttermilk|cream|yogurt|kefir)\b/, 1.03],
  [/\b(oil|olive)\b/, 0.92],
  [/\b(honey|molasses|syrup|maple)\b/, 1.42],
  [/brown sugar/, 0.93],
  [/\b(sugar|granulated)\b/, 0.85],
  [/\b(butter|ghee|lard|shortening)\b/, 0.91],
  [/\b(salt)\b/, 1.22],
  [/\bbaking (soda|powder)\b/, 0.9],
  [/\bcocoa\b/, 0.52],
  [/\b(rice)\b/, 0.85],
  [/\b(oats|oat)\b/, 0.41],
  [/\b(bread flour|all-?purpose|whole wheat|rye|spelt|flour)\b/, 0.53],
  [/\b(starter|levain)\b/, 1.0],
]

export function densityOf(ingredient) {
  if (ingredient?.density) return ingredient.density
  const name = (ingredient?.name || '').toLowerCase()
  for (const [re, d] of DENSITY_BY_NAME) if (re.test(name)) return d
  return 1.0
}

// Grams represented by a recipe line. Mass → grams directly; volume → ml × density;
// count → null (no reliable per-unit weight).
export function gramsForLine(line, ingredient) {
  const cat = unitCategory(line.unit)
  if (cat === 'mass') return toBase(line.quantity, line.unit)
  if (cat === 'volume') {
    const ml = toBase(line.quantity, line.unit)
    return ml == null ? null : ml * densityOf(ingredient)
  }
  return null
}
