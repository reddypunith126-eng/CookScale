import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { convert, toBase } from './utils/units.js'
import { uid, titleCase } from './utils/format.js'
import { findExistingIngredient, findExistingRecipe } from './utils/dedupe.js'
import { seedData } from './seed.js'

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useStore = create(
  persist(
    (set, get) => ({
      ...seedData(),

      // ----- Ingredients -----
      // Reuses an existing ingredient when the name (brand-aware) already
      // exists, so duplicates never enter the library. Different brands stay separate.
      addIngredient: (data) => {
        const existing = findExistingIngredient(data?.name || '', data?.brand || '', get().ingredients)
        if (existing) return existing.id
        const ing = {
          id: uid(),
          name: '',
          category: 'other',
          baseUnit: 'g',
          nutritionPer100: {},
          priceHistory: [], // [{ date, pricePerBase, store }]
          packages: [], // [{ label, unit, quantity, servings? }]
          servingSize: null, // grams/ml per serving (USDA)
          density: null, // g per ml, for volume→gram conversion (auto-detected if null)
          fdcId: null,
          brand: '',
          ...data,
        }
        ing.name = titleCase(ing.name)
        set((s) => ({ ingredients: [...s.ingredients, ing] }))
        return ing.id
      },
      updateIngredient: (id, patch) =>
        set((s) => ({
          ingredients: s.ingredients.map((i) =>
            i.id === id ? { ...i, ...patch, ...(patch.name != null ? { name: titleCase(patch.name) } : {}) } : i,
          ),
        })),
      deleteIngredient: (id) =>
        set((s) => ({ ingredients: s.ingredients.filter((i) => i.id !== id) })),
      deleteIngredients: (ids) => {
        const set2 = new Set(ids)
        set((s) => ({ ingredients: s.ingredients.filter((i) => !set2.has(i.id)) }))
      },

      // Merge duplicate ingredients into one. Every reference (recipe lines,
      // pantry, shopping list, purchases, meal plan) is remapped to the keeper;
      // the keeper absorbs any data it was missing from the losers.
      mergeIngredients: (keepId, removeIds) =>
        set((s) => {
          const gone = new Set(removeIds.filter((id) => id !== keepId))
          if (!gone.size) return {}
          const keeper = s.ingredients.find((i) => i.id === keepId)
          const losers = s.ingredients.filter((i) => gone.has(i.id))
          if (!keeper || !losers.length) return {}

          const merged = { ...keeper, nutritionPer100: { ...keeper.nutritionPer100 } }
          for (const l of losers) {
            for (const [k, v] of Object.entries(l.nutritionPer100 || {})) {
              if (!(merged.nutritionPer100[k] > 0) && v > 0) merged.nutritionPer100[k] = v
            }
            merged.priceHistory = [...merged.priceHistory, ...(l.priceHistory || [])]
            merged.packages = [...(merged.packages || []), ...(l.packages || [])]
            if (!merged.brand) merged.brand = l.brand
            if (!merged.fdcId) merged.fdcId = l.fdcId
            if (!merged.density) merged.density = l.density
            if (!merged.servingSize) merged.servingSize = l.servingSize
          }
          merged.priceHistory = [...merged.priceHistory].sort((a, b) => a.date.localeCompare(b.date))

          const remap = (id) => (gone.has(id) ? keepId : id)
          // Pantry rows for keeper + losers collapse into one row (quantities converted).
          const pantryKeep = []
          let pantryMerged = null
          for (const p of s.pantry) {
            if (p.ingredientId !== keepId && !gone.has(p.ingredientId)) { pantryKeep.push(p); continue }
            if (!pantryMerged) pantryMerged = { ...p, ingredientId: keepId }
            else pantryMerged.quantity += convert(p.quantity, p.unit, pantryMerged.unit) ?? 0
          }
          if (pantryMerged) pantryKeep.push(pantryMerged)

          return {
            ingredients: s.ingredients.filter((i) => !gone.has(i.id)).map((i) => (i.id === keepId ? merged : i)),
            recipes: s.recipes.map((r) => ({
              ...r,
              ingredients: (r.ingredients || []).map((l) => ({ ...l, ingredientId: remap(l.ingredientId) })),
            })),
            pantry: pantryKeep,
            shoppingList: s.shoppingList.map((i) => ({ ...i, ingredientId: remap(i.ingredientId) })),
            purchases: s.purchases.map((p) => ({ ...p, ingredientId: remap(p.ingredientId) })),
            mealPlan: s.mealPlan.map((m) => (m.ingredientId ? { ...m, ingredientId: remap(m.ingredientId) } : m)),
          }
        }),

      // Merge duplicate recipes: cook log, meal plan and bake log follow the keeper.
      mergeRecipes: (keepId, removeIds) =>
        set((s) => {
          const gone = new Set(removeIds.filter((id) => id !== keepId))
          if (!gone.size) return {}
          const keeper = s.recipes.find((r) => r.id === keepId)
          const losers = s.recipes.filter((r) => gone.has(r.id))
          if (!keeper || !losers.length) return {}
          const merged = {
            ...keeper,
            tags: [...new Set([...(keeper.tags || []), ...losers.flatMap((l) => l.tags || [])])],
            rating: Math.max(keeper.rating || 0, ...losers.map((l) => l.rating || 0)),
            favorite: keeper.favorite || losers.some((l) => l.favorite),
            image: keeper.image || losers.find((l) => l.image)?.image || '',
            nutrition: keeper.nutrition || losers.find((l) => l.nutrition)?.nutrition || null,
          }
          const remap = (id) => (gone.has(id) ? keepId : id)
          return {
            recipes: s.recipes.filter((r) => !gone.has(r.id)).map((r) => (r.id === keepId ? merged : r)),
            cookLog: s.cookLog.map((c) => ({ ...c, recipeId: remap(c.recipeId) })),
            mealPlan: s.mealPlan.map((m) => (m.recipeId ? { ...m, recipeId: remap(m.recipeId) } : m)),
            bakes: s.bakes.map((b) => (b.recipeId ? { ...b, recipeId: remap(b.recipeId) } : b)),
          }
        }),

      // Record buying an ingredient: drives both price history and grocery spend.
      addPurchase: ({ ingredientId, date, totalPrice, quantity, unit, store }) => {
        const ing = get().ingredients.find((i) => i.id === ingredientId)
        if (!ing) return
        const baseQty = convert(quantity, unit, ing.baseUnit)
        const pricePerBase = baseQty ? totalPrice / baseQty : 0
        const purchase = { id: uid(), ingredientId, date, totalPrice, quantity, unit, store: store || '' }
        set((s) => ({
          purchases: [...s.purchases, purchase],
          ingredients: s.ingredients.map((i) =>
            i.id === ingredientId
              ? { ...i, priceHistory: [...i.priceHistory, { date, pricePerBase, store: store || '' }] }
              : i,
          ),
        }))
      },

      // ----- Recipes -----
      // Same title (or same source URL) as an existing recipe → return that
      // recipe instead of creating a duplicate.
      addRecipe: (data) => {
        const dup = findExistingRecipe({ title: data?.title || '', sourceUrl: data?.sourceUrl || '' }, get().recipes)
        if (dup) return dup.id
        const r = {
          id: uid(),
          title: 'Untitled recipe',
          servings: 4,
          prepTime: 0,
          cookTime: 0,
          tags: [],
          ingredients: [], // [{ ingredientId, quantity, unit, note }]
          instructions: [],
          sourceUrl: '',
          image: '',
          rating: 0,
          favorite: false,
          createdAt: new Date().toISOString(),
          ...data,
        }
        set((s) => ({ recipes: [...s.recipes, r] }))
        return r.id
      },
      updateRecipe: (id, patch) =>
        set((s) => ({ recipes: s.recipes.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      deleteRecipe: (id) => set((s) => ({ recipes: s.recipes.filter((r) => r.id !== id) })),

      // ----- Cook log -----
      logCook: (recipeId, date, servings) => {
        const recipe = get().recipes.find((r) => r.id === recipeId)
        const entry = {
          id: uid(),
          recipeId,
          date: date || new Date().toISOString().slice(0, 10),
          servings: servings || recipe?.servings || 1,
        }
        set((s) => ({ cookLog: [...s.cookLog, entry] }))
        // Deduct ingredients from pantry (scaled to servings cooked).
        if (recipe) {
          const ratio = entry.servings / (recipe.servings || 1)
          recipe.ingredients.forEach((line) => {
            get().consumePantry(line.ingredientId, line.quantity * ratio, line.unit)
          })
        }
      },
      deleteCook: (id) => set((s) => ({ cookLog: s.cookLog.filter((c) => c.id !== id) })),

      // ----- Pantry -----
      setPantryItem: (ingredientId, quantity, unit) =>
        set((s) => {
          const exists = s.pantry.find((p) => p.ingredientId === ingredientId)
          if (exists) {
            return {
              pantry: s.pantry.map((p) =>
                p.ingredientId === ingredientId ? { ...p, quantity, unit } : p,
              ),
            }
          }
          return { pantry: [...s.pantry, { ingredientId, quantity, unit }] }
        }),
      removePantryItem: (ingredientId) =>
        set((s) => ({ pantry: s.pantry.filter((p) => p.ingredientId !== ingredientId) })),
      consumePantry: (ingredientId, quantity, unit) =>
        set((s) => ({
          pantry: s.pantry
            .map((p) => {
              if (p.ingredientId !== ingredientId) return p
              const used = convert(quantity, unit, p.unit) ?? 0
              return { ...p, quantity: Math.max(0, p.quantity - used) }
            })
            .filter((p) => p.quantity > 0),
        })),

      // ----- Shopping list -----
      addShoppingItem: (item) =>
        set((s) => ({ shoppingList: [...s.shoppingList, { id: uid(), checked: false, price: null, ...item }] })),
      updateShoppingItem: (id, patch) =>
        set((s) => ({ shoppingList: s.shoppingList.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      toggleShoppingItem: (id) =>
        set((s) => ({
          shoppingList: s.shoppingList.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)),
        })),
      removeShoppingItem: (id) =>
        set((s) => ({ shoppingList: s.shoppingList.filter((i) => i.id !== id) })),
      clearCheckedShopping: () =>
        set((s) => ({ shoppingList: s.shoppingList.filter((i) => !i.checked) })),

      // Receive items into the pantry. Any item with a price logs a purchase,
      // which auto-updates that ingredient's price history.
      receiveShopping: (ids, date) => {
        const today = date || new Date().toISOString().slice(0, 10)
        const items = get().shoppingList.filter((i) => ids.includes(i.id) && i.ingredientId)
        for (const item of items) {
          if (item.price > 0) {
            get().addPurchase({ ingredientId: item.ingredientId, date: today, totalPrice: item.price, quantity: item.quantity, unit: item.unit, store: item.store || 'Receipt' })
          }
          const existing = get().pantry.find((p) => p.ingredientId === item.ingredientId)
          const ing = get().ingredients.find((i) => i.id === item.ingredientId)
          const targetUnit = existing?.unit || ing?.baseUnit || item.unit
          const add = convert(item.quantity, item.unit, targetUnit) ?? item.quantity
          get().setPantryItem(item.ingredientId, (existing?.quantity || 0) + add, targetUnit)
        }
        set((s) => ({ shoppingList: s.shoppingList.filter((i) => !ids.includes(i.id)) }))
      },

      setAllShoppingChecked: (checked) =>
        set((s) => ({ shoppingList: s.shoppingList.map((i) => ({ ...i, checked })) })),

      // Finalize a shopping trip: logs a purchase per priced item (→ price history
      // + grocery spend), stocks the pantry, records the trip, and clears the items.
      checkoutShopping: (ids, { store, date } = {}) => {
        const day = date || new Date().toISOString().slice(0, 10)
        const items = get().shoppingList.filter((i) => ids.includes(i.id) && i.ingredientId)
        let total = 0
        for (const item of items) {
          if (item.price > 0) {
            total += item.price
            get().addPurchase({ ingredientId: item.ingredientId, date: day, totalPrice: item.price, quantity: item.quantity, unit: item.unit, store: store || item.store || 'Groceries' })
          }
          const existing = get().pantry.find((p) => p.ingredientId === item.ingredientId)
          const ing = get().ingredients.find((i) => i.id === item.ingredientId)
          const targetUnit = existing?.unit || ing?.baseUnit || item.unit
          const add = convert(item.quantity, item.unit, targetUnit) ?? item.quantity
          get().setPantryItem(item.ingredientId, (existing?.quantity || 0) + add, targetUnit)
        }
        set((s) => ({
          shoppingList: s.shoppingList.filter((i) => !ids.includes(i.id)),
          shoppingTrips: [...(s.shoppingTrips || []), { id: uid(), date: day, store: store || '', total, itemCount: items.length }],
        }))
        return total
      },

      // ----- Meal planner -----
      addMealPlan: (date, recipeId, meal) =>
        set((s) => ({ mealPlan: [...s.mealPlan, { id: uid(), date, recipeId, meal: meal || 'dinner' }] })),
      addMealIngredient: (date, ingredientId, quantity, unit, meal) =>
        set((s) => ({ mealPlan: [...s.mealPlan, { id: uid(), date, ingredientId, quantity, unit, meal: meal || 'snack' }] })),
      removeMealPlan: (id) => set((s) => ({ mealPlan: s.mealPlan.filter((m) => m.id !== id) })),

      // ----- Sourdough starter -----
      addFeeding: (data) =>
        set((s) => ({
          starterFeedings: [
            ...s.starterFeedings,
            {
              id: uid(),
              date: new Date().toISOString().slice(0, 16),
              flour: 50,
              water: 50,
              starter: 50,
              flourType: 'bread flour',
              tempF: 72,
              note: '',
              discardUsed: false,
              ...data,
            },
          ],
        })),
      deleteFeeding: (id) =>
        set((s) => ({ starterFeedings: s.starterFeedings.filter((f) => f.id !== id) })),

      // ----- Bread bakes (experiment log) -----
      addBake: (data) =>
        set((s) => ({
          bakes: [
            ...s.bakes,
            {
              id: uid(),
              date: new Date().toISOString().slice(0, 10),
              label: '',
              recipeId: '',
              hydration: 70,
              folds: 3,
              bulkHours: 4,
              bulkTempF: 74,
              proofType: 'fridge',
              proofHours: 12,
              bakeTempF: 450,
              // outcomes (1–5 unless noted)
              risePct: 50,
              ovenSpring: 3,
              crumb: 3,
              crust: 3,
              overall: 3,
              notes: '',
              photo: '',
              ...data,
            },
          ],
        })),
      updateBake: (id, patch) =>
        set((s) => ({ bakes: s.bakes.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
      deleteBake: (id) => set((s) => ({ bakes: s.bakes.filter((b) => b.id !== id) })),

      // ----- Settings -----
      setSetting: (key, value) => set((s) => ({ settings: { ...s.settings, [key]: value } })),

      resetAll: () => set(seedData()),
    }),
    { name: 'hearth-store', version: 1 },
  ),
)

// ---------------------------------------------------------------------------
// Derived selectors (pure helpers — pass in current state slices)
// ---------------------------------------------------------------------------
export function currentPricePerBase(ingredient) {
  const h = ingredient?.priceHistory
  if (!h || !h.length) return null
  return [...h].sort((a, b) => a.date.localeCompare(b.date)).at(-1).pricePerBase
}

export function lineCost(line, ingredient) {
  const ppb = currentPricePerBase(ingredient)
  if (ppb == null) return null
  const baseQty = convert(line.quantity, line.unit, ingredient.baseUnit)
  if (baseQty == null) return null
  return baseQty * ppb
}

export function recipeCost(recipe, ingredientsById) {
  let total = 0
  let known = 0
  for (const line of recipe.ingredients || []) {
    const c = lineCost(line, ingredientsById[line.ingredientId])
    if (c != null) {
      total += c
      known++
    }
  }
  return {
    total,
    perServing: total / (recipe.servings || 1),
    complete: known === (recipe.ingredients?.length || 0) && known > 0,
    knownCount: known,
  }
}

// How much of each ingredient has actually been consumed via the cook log.
export function ingredientUsage(cookLog, recipesById, ingredientsById) {
  const usage = {} // ingredientId -> { baseQty, baseUnit, cookCount, recipeIds:Set }
  for (const cook of cookLog) {
    const recipe = recipesById[cook.recipeId]
    if (!recipe) continue
    const ratio = cook.servings / (recipe.servings || 1)
    for (const line of recipe.ingredients) {
      const ing = ingredientsById[line.ingredientId]
      if (!ing) continue
      const baseQty = (toBase(line.quantity, line.unit) ?? 0) * ratio
      if (!usage[line.ingredientId]) {
        usage[line.ingredientId] = { baseQty: 0, baseUnit: ing.baseUnit, cookCount: 0, recipeIds: new Set() }
      }
      usage[line.ingredientId].baseQty += baseQty
      usage[line.ingredientId].cookCount += 1
      usage[line.ingredientId].recipeIds.add(recipe.id)
    }
  }
  return usage
}

// Recommend recipes by how well the pantry covers their ingredients.
export function recommendRecipes(recipes, pantry, ingredientsById) {
  const have = new Map() // ingredientId -> baseQty available
  for (const p of pantry) {
    const ing = ingredientsById[p.ingredientId]
    if (!ing) continue
    have.set(p.ingredientId, toBase(p.quantity, p.unit) ?? 0)
  }
  return recipes
    .map((r) => {
      const lines = r.ingredients || []
      let covered = 0
      const missing = []
      for (const line of lines) {
        const ing = ingredientsById[line.ingredientId]
        const need = toBase(line.quantity, line.unit) ?? 0
        const avail = have.get(line.ingredientId) ?? 0
        if (avail >= need && avail > 0) covered++
        else missing.push({ line, ingredient: ing, haveSome: avail > 0 })
      }
      return {
        recipe: r,
        coverage: lines.length ? covered / lines.length : 0,
        missing,
        canMake: missing.length === 0 && lines.length > 0,
      }
    })
    .filter((x) => x.recipe.ingredients?.length)
    .sort((a, b) => b.coverage - a.coverage)
}
