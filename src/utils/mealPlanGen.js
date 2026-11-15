import { resolvePerServing, DAILY_VALUES } from './nutrition.js'
import { recipeCost } from '../store.js'

// ---------------------------------------------------------------------------
// Weekly meal recommendation engine. Scores every recipe per serving against
// the chosen macro profile, plus optional cost, vitamin-focus and fiber
// weights, then assembles a varied 7-day plan.
// ---------------------------------------------------------------------------

// Calorie-share targets (protein/carbs/fat as fraction of calories).
export const MACRO_PROFILES = [
  { key: 'balanced', label: 'Balanced', targets: { protein: 0.2, carbs: 0.5, fat: 0.3 } },
  { key: 'high-protein', label: 'High protein', targets: { protein: 0.35, carbs: 0.4, fat: 0.25 } },
  { key: 'low-carb', label: 'Low carb', targets: { protein: 0.3, carbs: 0.2, fat: 0.5 } },
  { key: 'keto', label: 'Keto', targets: { protein: 0.25, carbs: 0.05, fat: 0.7 } },
  { key: 'low-fat', label: 'Low fat', targets: { protein: 0.25, carbs: 0.6, fat: 0.15 } },
  { key: 'endurance', label: 'Endurance / high carb', targets: { protein: 0.18, carbs: 0.6, fat: 0.22 } },
]

// Top 5 tracked micronutrients available for a vitamin-focused week.
export const VITAMIN_OPTIONS = [
  { key: 'vitaminA', label: 'Vitamin A' },
  { key: 'vitaminC', label: 'Vitamin C' },
  { key: 'vitaminD', label: 'Vitamin D' },
  { key: 'calcium', label: 'Calcium' },
  { key: 'iron', label: 'Iron' },
]

// How closely a per-serving nutrition profile matches target calorie shares (0..1).
function macroScore(per, targets) {
  const pc = (per.protein || 0) * 4
  const cc = (per.carbs || 0) * 4
  const fc = (per.fat || 0) * 9
  const total = pc + cc + fc
  if (!total) return 0
  const dev =
    Math.abs(pc / total - targets.protein) +
    Math.abs(cc / total - targets.carbs) +
    Math.abs(fc / total - targets.fat)
  return Math.max(0, 1 - dev / 2)
}

// Score all recipes. Options:
//   profileKey  — key from MACRO_PROFILES
//   useCost     — prefer cheaper meals (recipes without prices are neutral)
//   maxCost     — optional hard cap on $/serving (only applied when known)
//   vitamins    — array of VITAMIN_OPTIONS keys to emphasise
//   useFiber    — emphasise fiber-rich meals
export function scoreRecipes(recipes, ingredientsById, opts) {
  const profile = MACRO_PROFILES.find((p) => p.key === opts.profileKey) || MACRO_PROFILES[0]
  const scored = []
  for (const recipe of recipes) {
    if (!(recipe.ingredients?.length || recipe.nutrition)) continue
    const per = resolvePerServing(recipe, ingredientsById)
    if (!per.calories) continue // no nutrition data — can't rank it
    const cost = recipeCost(recipe, ingredientsById)
    const costPerServing = cost.knownCount ? cost.perServing : null
    if (opts.useCost && opts.maxCost > 0 && costPerServing != null && costPerServing > opts.maxCost) continue

    const parts = [{ w: 1, s: macroScore(per, profile.targets) }]
    if (opts.useCost) {
      // 1 at free, ~0.5 at $4/serving, → 0 as cost grows. Unknown cost = neutral.
      parts.push({ w: 0.6, s: costPerServing == null ? 0.5 : 1 / (1 + costPerServing / 4) })
    }
    if (opts.vitamins?.length) {
      const v =
        opts.vitamins.reduce((acc, key) => acc + Math.min(1, (per[key] || 0) / ((DAILY_VALUES[key] || 1) / 3)), 0) /
        opts.vitamins.length
      parts.push({ w: 0.8, s: v })
    }
    if (opts.useFiber) {
      parts.push({ w: 0.5, s: Math.min(1, (per.fiber || 0) / (DAILY_VALUES.fiber / 3)) })
    }
    const wSum = parts.reduce((a, p) => a + p.w, 0)
    const score = parts.reduce((a, p) => a + p.w * p.s, 0) / wSum
    scored.push({ recipe, per, costPerServing, score })
  }
  return scored.sort((a, b) => b.score - a.score)
}

// Build a 7-day plan from scored recipes. Prefers the top of the list but
// samples with mild randomness so "shuffle" produces fresh-but-good weeks.
// Repeats only when fewer than 7 recipes qualify.
export function buildWeek(scored, { shuffle = false } = {}) {
  if (!scored.length) return []
  const pool = [...scored.slice(0, Math.max(10, 7))]
  const picks = []
  while (picks.length < 7 && pool.length) {
    let idx = 0
    if (shuffle) {
      // Weighted sample: quality-biased but varied.
      const weights = pool.map((r, i) => (r.score + 0.05) / (i + 1))
      const total = weights.reduce((a, b) => a + b, 0)
      let roll = Math.random() * total
      idx = weights.findIndex((w) => (roll -= w) <= 0)
      if (idx < 0) idx = 0
    }
    picks.push(pool.splice(idx, 1)[0])
  }
  while (picks.length < 7) picks.push(picks[picks.length % Math.max(1, scored.length)])

  const days = []
  const start = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push({ date: d.toISOString().slice(0, 10), ...picks[i] })
  }
  return days
}
