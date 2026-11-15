import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { startOfWeek, addDays, format, isSameDay } from 'date-fns'
import { useStore, recipeCost, lineCost } from '../store.js'
import { resolveTotal, lineNutrition, addNutrition, emptyNutrition } from '../utils/nutrition.js'
import { money, num, today, fmtDate } from '../utils/format.js'
import { unitLabel, formatQuantity } from '../utils/units.js'
import { servingSizeOf } from '../utils/packaging.js'
import { PageHead, Drawer } from '../components/ui.jsx'
import NutritionPanel from '../components/NutritionPanel.jsx'
import Icon from '../components/Icon.jsx'
import { recipeThumb } from '../utils/recipeThumb.js'
import { useDialogs } from '../components/Dialogs.jsx'

// Real current date at local midnight, so the "today" highlight is always correct.
const TODAY = today()

export default function MealPlanner() {
  const mealPlan = useStore((s) => s.mealPlan)
  const recipes = useStore((s) => s.recipes)
  const ingredients = useStore((s) => s.ingredients)
  const { addMealPlan, addMealIngredient, removeMealPlan, addShoppingItem } = useStore()
  const { notify } = useDialogs()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(TODAY, { weekStartsOn: 1 }))
  const [addFor, setAddFor] = useState(null)     // date string of the day being added to
  const [nutriOpen, setNutriOpen] = useState(false)

  const recipesById = useMemo(() => Object.fromEntries(recipes.map((r) => [r.id, r])), [recipes])
  const ingredientsById = useMemo(() => Object.fromEntries(ingredients.map((i) => [i.id, i])), [ingredients])

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const planByDate = useMemo(() => {
    const m = {}
    for (const p of mealPlan) (m[p.date] ||= []).push(p)
    return m
  }, [mealPlan])

  const entryNutrition = (p) => {
    if (p.recipeId) { const r = recipesById[p.recipeId]; return r ? resolveTotal(r, ingredientsById) : emptyNutrition() }
    if (p.ingredientId) return lineNutrition({ quantity: p.quantity, unit: p.unit }, ingredientsById[p.ingredientId])
    return emptyNutrition()
  }
  const entryCost = (p) => {
    if (p.recipeId) { const r = recipesById[p.recipeId]; return r ? recipeCost(r, ingredientsById).total || 0 : 0 }
    if (p.ingredientId) return lineCost({ quantity: p.quantity, unit: p.unit }, ingredientsById[p.ingredientId]) || 0
    return 0
  }

  const dayStats = (plans) => {
    let cost = 0, kcal = 0
    for (const p of plans) { cost += entryCost(p); kcal += entryNutrition(p).calories }
    return { cost, kcal }
  }

  // Add a recipe or ingredient to a day.
  function addItem(date, kind, id) {
    if (kind === 'recipe') addMealPlan(date, id)
    else {
      const ing = ingredientsById[id]
      if (ing) addMealIngredient(date, ing.id, servingSizeOf(ing), ing.baseUnit)
    }
  }

  const weekPlans = days.flatMap((d) => planByDate[format(d, 'yyyy-MM-dd')] || [])
  const weekCost = weekPlans.reduce((a, p) => a + entryCost(p), 0)
  const weekNutrition = weekPlans.reduce((acc, p) => addNutrition(acc, entryNutrition(p)), emptyNutrition())
  const perDayNutrition = useMemo(() => {
    const out = emptyNutrition()
    for (const k of Object.keys(weekNutrition)) out[k] = weekNutrition[k] / 7
    return out
  }, [weekNutrition])

  function generateShoppingForWeek() {
    weekPlans.forEach((p) => {
      if (p.recipeId) recipesById[p.recipeId]?.ingredients.forEach((line) => addShoppingItem({ ingredientId: line.ingredientId, quantity: line.quantity, unit: line.unit, note: `${recipesById[p.recipeId].title} · ${fmtDate(p.date, 'MMM d')}` }))
      else if (p.ingredientId) addShoppingItem({ ingredientId: p.ingredientId, quantity: p.quantity, unit: p.unit, note: `Plan · ${fmtDate(p.date, 'MMM d')}` })
    })
    notify("Added this week's items to your shopping list.", 'success')
  }

  return (
    <>
      <PageHead title="Meal planner" subtitle={`Week of ${format(weekStart, 'MMM d')} · ${money(weekCost)} · ${num(weekNutrition.calories)} kcal planned`}>
        <button className="btn" onClick={() => setWeekStart((w) => addDays(w, -7))}>←</button>
        <button className="btn" onClick={() => setWeekStart(startOfWeek(TODAY, { weekStartsOn: 1 }))}>This week</button>
        <button className="btn" onClick={() => setWeekStart((w) => addDays(w, 7))}>→</button>
        <button className="btn" onClick={() => setNutriOpen(true)} disabled={!weekPlans.length}>Nutrition</button>
        <button className="btn primary" onClick={generateShoppingForWeek} disabled={!weekPlans.length}><Icon name="cart" size={16} /> Shop for week</button>
      </PageHead>

      <div className="grid week-grid">
        {days.map((d) => {
          const key = format(d, 'yyyy-MM-dd')
          const plans = planByDate[key] || []
          const { cost, kcal } = dayStats(plans)
          const isToday = isSameDay(d, TODAY)
          return (
            <div key={key} className={'cal-day' + (isToday ? ' today' : '')}>
              <div className="cal-head">
                <span className="cal-dow">{format(d, 'EEE')}</span>
                <span className="cal-dom">{format(d, 'MMM d')}</span>
              </div>
              <div className="cal-meals">
                {plans.length === 0 && <span className="cal-empty">—</span>}
                {plans.map((p) => {
                  const isRecipe = !!p.recipeId
                  const r = isRecipe ? recipesById[p.recipeId] : null
                  const ing = !isRecipe ? ingredientsById[p.ingredientId] : null
                  return (
                    <div key={p.id} className="cal-meal">
                      {isRecipe
                        ? <Link to={`/recipes/${p.recipeId}`} className="cal-title">{r?.title || 'Unknown'}</Link>
                        : <Link to={`/ingredients/${p.ingredientId}`} className="cal-title">{formatQuantity(p.quantity, p.unit)} {unitLabel(p.unit)} {ing?.name || 'Unknown'}</Link>}
                      <button className="cal-x" onClick={() => removeMealPlan(p.id)} aria-label="Remove"><Icon name="x" size={12} /></button>
                    </div>
                  )
                })}
              </div>
              {plans.length > 0 && <div className="cal-foot">{money(cost)} · {num(kcal)} kcal</div>}
              <button className="cal-add" onClick={() => setAddFor(key)}><Icon name="plus" size={13} /> Add</button>
            </div>
          )
        })}
      </div>

      {addFor && (
        <AddMealDrawer
          date={addFor}
          recipes={recipes}
          ingredients={ingredients}
          ingredientsById={ingredientsById}
          onClose={() => setAddFor(null)}
          onAdd={(kind, id, label) => { addItem(addFor, kind, id); notify(`${label} added to ${fmtDate(addFor, 'EEE')}`, 'success') }}
        />
      )}

      {nutriOpen && (
        <Drawer title="Week nutrition" onClose={() => setNutriOpen(false)}>
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>Daily average across the planned week.</p>
          <div style={{ marginTop: 14 }}>
            <NutritionPanel nutrition={perDayNutrition} label="Per day" />
          </div>
        </Drawer>
      )}
    </>
  )
}

function AddMealDrawer({ date, recipes, ingredients, ingredientsById, onClose, onAdd }) {
  const [q, setQ] = useState('')
  const ql = q.trim().toLowerCase()

  const recipeMatches = useMemo(
    () => [...recipes].sort((a, b) => a.title.localeCompare(b.title))
      .filter((r) => !ql || r.title.toLowerCase().includes(ql)).slice(0, 40),
    [recipes, ql],
  )
  const ingMatches = useMemo(
    () => !ql ? [] : [...ingredients].sort((a, b) => a.name.localeCompare(b.name))
      .filter((i) => i.name.toLowerCase().includes(ql)).slice(0, 20),
    [ingredients, ql],
  )

  return (
    <Drawer title={`Add to ${fmtDate(date, 'EEE, MMM d')}`} onClose={onClose}>
      <input autoFocus placeholder="Search recipes & ingredients…" value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="add-list">
        <div className="add-group">Recipes</div>
        {recipeMatches.length === 0 && <div className="add-none">No recipes match.</div>}
        {recipeMatches.map((r) => {
          const cost = recipeCost(r, ingredientsById)
          const thumb = recipeThumb(r)
          return (
            <button key={r.id} className="add-item" onClick={() => onAdd('recipe', r.id, r.title)}>
              <span className="add-emoji" style={{ background: thumb.gradient }} aria-hidden="true">{thumb.emoji}</span>
              <span className="add-t"><b>{r.title}</b><small>{cost.knownCount ? `${money(cost.perServing)}/serv` : 'recipe'}</small></span>
              <Icon name="plus" size={15} />
            </button>
          )
        })}

        {ingMatches.length > 0 && <div className="add-group">Ingredients</div>}
        {ingMatches.map((i) => (
          <button key={i.id} className="add-item" onClick={() => onAdd('ingredient', i.id, i.name)}>
            <span className="add-emoji plain" aria-hidden="true"><Icon name="tag" size={14} /></span>
            <span className="add-t"><b>{i.name}</b><small>ingredient · one serving</small></span>
            <Icon name="plus" size={15} />
          </button>
        ))}
      </div>
    </Drawer>
  )
}
