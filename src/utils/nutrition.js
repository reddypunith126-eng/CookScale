import { convert } from './units.js'

// Nutrient catalogue. Values on an ingredient are stored "per 100 base units"
// (per 100 g for mass, per 100 ml for volume, per 100 each for count).
export const NUTRIENTS = [
  { key: 'calories', label: 'Calories', unit: 'kcal', group: 'energy' },
  { key: 'protein', label: 'Protein', unit: 'g', group: 'macro' },
  { key: 'carbs', label: 'Carbs', unit: 'g', group: 'macro' },
  { key: 'fat', label: 'Fat', unit: 'g', group: 'macro' },
  { key: 'fiber', label: 'Fiber', unit: 'g', group: 'macro' },
  { key: 'sugar', label: 'Sugar', unit: 'g', group: 'macro' },
  { key: 'sodium', label: 'Sodium', unit: 'mg', group: 'mineral' },
  { key: 'calcium', label: 'Calcium', unit: 'mg', group: 'mineral' },
  { key: 'iron', label: 'Iron', unit: 'mg', group: 'mineral' },
  { key: 'potassium', label: 'Potassium', unit: 'mg', group: 'mineral' },
  { key: 'vitaminA', label: 'Vitamin A', unit: 'µg', group: 'vitamin' },
  { key: 'vitaminC', label: 'Vitamin C', unit: 'mg', group: 'vitamin' },
  { key: 'vitaminD', label: 'Vitamin D', unit: 'µg', group: 'vitamin' },
]

export const MACRO_KEYS = ['protein', 'carbs', 'fat', 'fiber']

// Reference daily values used for the "% daily" hints (rough adult averages).
export const DAILY_VALUES = {
  calories: 2000, protein: 50, carbs: 275, fat: 78, fiber: 28, sugar: 50,
  sodium: 2300, calcium: 1300, iron: 18, potassium: 4700,
  vitaminA: 900, vitaminC: 90, vitaminD: 20,
}

export function emptyNutrition() {
  return NUTRIENTS.reduce((acc, n) => ((acc[n.key] = 0), acc), {})
}

// Nutrition contributed by a single recipe-ingredient line.
export function lineNutrition(line, ingredient) {
  const out = emptyNutrition()
  if (!ingredient?.nutritionPer100) return out
  const baseQty = convert(line.quantity, line.unit, ingredient.baseUnit)
  if (baseQty == null) return out
  const factor = baseQty / 100
  for (const n of NUTRIENTS) {
    out[n.key] = (ingredient.nutritionPer100[n.key] || 0) * factor
  }
  return out
}

// Total + per-serving nutrition for a recipe. `coverage` is the share of
// ingredient lines that actually carry nutrition data (0..1).
export function recipeNutrition(recipe, ingredientsById) {
  const total = emptyNutrition()
  const lines = recipe.ingredients || []
  let withData = 0
  for (const line of lines) {
    const ing = ingredientsById[line.ingredientId]
    if (Object.values(ing?.nutritionPer100 || {}).some((v) => v > 0)) withData++
    const ln = lineNutrition(line, ing)
    for (const n of NUTRIENTS) total[n.key] += ln[n.key]
  }
  const servings = recipe.servings || 1
  const perServing = emptyNutrition()
  for (const n of NUTRIENTS) perServing[n.key] = total[n.key] / servings
  return { total, perServing, coverage: lines.length ? withData / lines.length : 0 }
}

export function addNutrition(a, b, scale = 1) {
  const out = { ...a }
  for (const n of NUTRIENTS) out[n.key] = (out[n.key] || 0) + (b[n.key] || 0) * scale
  return out
}

// Prefer nutrition computed from ingredients — but only once every ingredient
// line carries data. A fresh import usually has an accurate per-serving label
// while most of its ingredients are still blank, and a partial computation
// (e.g. only the olive oil counted) badly understates the real numbers.
export function resolvePerServing(recipe, ingredientsById) {
  const { perServing, coverage } = recipeNutrition(recipe, ingredientsById)
  if (recipe?.nutrition && coverage < 1) return { ...emptyNutrition(), ...recipe.nutrition }
  if (perServing.calories > 0) return perServing
  if (recipe?.nutrition) return { ...emptyNutrition(), ...recipe.nutrition }
  return perServing
}

export function resolveTotal(recipe, ingredientsById) {
  const { total, coverage } = recipeNutrition(recipe, ingredientsById)
  const fromLabel = () => {
    const per = { ...emptyNutrition(), ...recipe.nutrition }
    const servings = recipe.servings || 1
    const out = emptyNutrition()
    for (const n of NUTRIENTS) out[n.key] = (per[n.key] || 0) * servings
    return out
  }
  if (recipe?.nutrition && coverage < 1) return fromLabel()
  if (total.calories > 0) return total
  if (recipe?.nutrition) return fromLabel()
  return total
}
