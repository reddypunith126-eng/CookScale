import { toBase, unitLabel } from './units.js'

// Common retail package presets, used to seed an ingredient's packaging and to
// offer "1 can / 1 bag" style intake in the pantry. quantity is in `unit`.
export const PACKAGE_TEMPLATES = [
  { label: 'can', unit: 'g', quantity: 400 },
  { label: 'small can', unit: 'g', quantity: 200 },
  { label: 'bag', unit: 'g', quantity: 500 },
  { label: 'large bag', unit: 'g', quantity: 1000 },
  { label: 'box', unit: 'g', quantity: 500 },
  { label: 'bottle', unit: 'ml', quantity: 500 },
  { label: 'carton', unit: 'ml', quantity: 1000 },
  { label: 'jar', unit: 'g', quantity: 340 },
  { label: 'stick', unit: 'g', quantity: 113 },
  { label: 'dozen', unit: 'each', quantity: 12 },
  { label: 'bunch', unit: 'g', quantity: 150 },
  { label: 'each', unit: 'each', quantity: 1 },
]

// Typical USDA serving sizes (grams) when an ingredient has none set.
const DEFAULT_SERVING_G = 100

export function servingSizeOf(ingredient) {
  return ingredient?.servingSize || (ingredient?.baseUnit === 'each' ? 1 : DEFAULT_SERVING_G)
}

// How many servings a quantity represents, given the ingredient's serving size.
export function servingsFor(ingredient, quantity, unit) {
  const base = toBase(quantity, unit)
  if (base == null) return null
  const size = servingSizeOf(ingredient)
  return size ? base / size : null
}

// Human label for a package, e.g. "1 can ≈ 400 g · ~1.1 servings".
export function describePackage(ingredient, pkg) {
  const base = toBase(pkg.quantity, pkg.unit) ?? pkg.quantity
  const servings = servingsFor(ingredient, pkg.quantity, pkg.unit)
  const bits = [`${pkg.quantity} ${unitLabel(pkg.unit)}`]
  if (servings) bits.push(`~${servings.toFixed(1)} servings`)
  return `1 ${pkg.label} ≈ ${bits.join(' · ')}`
}
