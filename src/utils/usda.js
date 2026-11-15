// USDA FoodData Central (open government data). Default DEMO_KEY works out of the
// box with shared rate limits; users can paste their own api.data.gov key.
// Docs: https://fdc.nal.usda.gov/api-guide.html
const BASE = 'https://api.nal.usda.gov/fdc/v1'

// USDA nutrient numbers -> our nutrition keys (values are per 100 g/ml).
const NUTRIENT_MAP = {
  208: 'calories', 203: 'protein', 205: 'carbs', 204: 'fat', 291: 'fiber',
  269: 'sugar', 307: 'sodium', 301: 'calcium', 303: 'iron', 306: 'potassium',
  320: 'vitaminA', 401: 'vitaminC', 328: 'vitaminD',
}

function nutrientNumber(n) {
  return n.nutrientNumber || n.nutrient?.number || (n.nutrientId != null ? String(n.nutrientId) : null)
}

function extractNutrition(foodNutrients = []) {
  const out = {}
  for (const n of foodNutrients) {
    const key = NUTRIENT_MAP[nutrientNumber(n)]
    if (!key) continue
    const value = n.value ?? n.amount
    if (value != null) out[key] = Math.round(value * 100) / 100
  }
  return out
}

export async function searchFoods(query, apiKey = 'DEMO_KEY') {
  const url = `${BASE}/foods/search?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(query)}&pageSize=12&dataType=${encodeURIComponent('Foundation,SR Legacy,Branded')}`
  const res = await fetch(url)
  if (res.status === 429) throw new Error('USDA rate limit hit (DEMO_KEY is shared). Add your own free key in Settings.')
  if (!res.ok) throw new Error('USDA search failed (' + res.status + ')')
  const data = await res.json()
  return (data.foods || []).map((f) => ({
    fdcId: f.fdcId,
    name: f.description,
    brand: f.brandOwner || f.brandName || '',
    dataType: f.dataType,
    nutritionPer100: extractNutrition(f.foodNutrients),
    servingSize: f.servingSize || null,
    servingSizeUnit: (f.servingSizeUnit || 'g').toLowerCase(),
    householdServing: f.householdServingFullText || '',
  }))
}

// Normalize a search hit into an ingredient patch (nutrition, serving, package).
export function usdaToIngredientPatch(food) {
  const baseUnit = food.servingSizeUnit === 'ml' ? 'ml' : 'g'
  const patch = {
    fdcId: food.fdcId,
    brand: food.brand,
    baseUnit,
    nutritionPer100: { ...food.nutritionPer100 },
  }
  if (food.servingSize && (food.servingSizeUnit === 'g' || food.servingSizeUnit === 'ml')) {
    patch.servingSize = food.servingSize
  }
  // Branded items often describe a package, e.g. "1 can (425 g)".
  if (food.servingSize && food.householdServing) {
    patch.packages = [{
      label: food.householdServing.replace(/\([^)]*\)/, '').trim() || 'serving',
      unit: baseUnit,
      quantity: food.servingSize,
      servings: 1,
    }]
  }
  return patch
}
