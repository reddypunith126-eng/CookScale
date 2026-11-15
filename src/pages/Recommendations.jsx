import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore, recommendRecipes, recipeCost } from '../store.js'
import { resolvePerServing } from '../utils/nutrition.js'
import { MACRO_PROFILES, VITAMIN_OPTIONS, scoreRecipes, buildWeek } from '../utils/mealPlanGen.js'
import { money, num, fmtDate } from '../utils/format.js'
import { unitLabel } from '../utils/units.js'
import { PageHead, Empty } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { recipeThumb } from '../utils/recipeThumb.js'
import { useDialogs } from '../components/Dialogs.jsx'

export default function Recommendations() {
  const [tab, setTab] = useState('pantry')
  return (
    <>
      <PageHead title="What can I make?" subtitle="Cook from your pantry, or let Hearth plan your week around your goals" />
      <div className="tabs">
        <button className={tab === 'pantry' ? 'on' : ''} onClick={() => setTab('pantry')}>
          <span className="ic"><Icon name="box" size={15} /></span> From my pantry
        </button>
        <button className={tab === 'week' ? 'on' : ''} onClick={() => setTab('week')}>
          <span className="ic"><Icon name="calendar" size={15} /></span> Weekly plan
        </button>
      </div>
      {tab === 'pantry' ? <PantryRecs /> : <WeeklyPlan />}
    </>
  )
}

// ---------------------------------------------------------------------------
// Tab 1 — recipes the pantry can cover right now (existing behaviour)
// ---------------------------------------------------------------------------
function PantryRecs() {
  const { notify } = useDialogs()
  const navigate = useNavigate()
  const recipes = useStore((s) => s.recipes)
  const pantry = useStore((s) => s.pantry)
  const ingredients = useStore((s) => s.ingredients)
  const { addShoppingItem } = useStore()
  const ingredientsById = useMemo(() => Object.fromEntries(ingredients.map((i) => [i.id, i])), [ingredients])

  const recs = useMemo(() => recommendRecipes(recipes, pantry, ingredientsById), [recipes, pantry, ingredientsById])
  const canMake = recs.filter((r) => r.canMake)
  const almost = recs.filter((r) => !r.canMake && r.coverage > 0)

  return (
    <>
      {pantry.length === 0 && (
        <Empty icon="box" title="Add items to your pantry first">
          <Link to="/pantry" className="btn primary" style={{ marginTop: 6 }}>Go to pantry</Link>
        </Empty>
      )}

      {canMake.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 0 }}>Ready to cook ({canMake.length})</div>
          <div className="ledger index-recipes">
            <table>
              <thead>
                <tr>
                  <th>Recipe</th>
                  <th className="num">Yield</th>
                  <th className="num">Time</th>
                  <th className="num">Kcal</th>
                  <th className="num">Cost / serving</th>
                </tr>
              </thead>
              <tbody>
                {canMake.map(({ recipe }) => {
                  const cost = recipeCost(recipe, ingredientsById)
                  const nutr = resolvePerServing(recipe, ingredientsById)
                  const thumb = recipeThumb(recipe)
                  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0)
                  return (
                    <tr key={recipe.id} className="clickable" onClick={() => navigate(`/recipes/${recipe.id}`)}>
                      <td>
                        <div className="rx-name">
                          <span className="rx-swatch" style={{ background: thumb.gradient }} aria-hidden="true">{thumb.emoji}</span>
                          <span className="rx-title">
                            <span className="rx-t">{recipe.title}</span>
                            <span className="rx-tags">{(recipe.tags || []).slice(0, 4).join(' · ') || 'untagged'}</span>
                            <span className="rx-specs">
                              <span>{recipe.servings} serv</span>
                              {totalTime > 0 && <span>{totalTime} min</span>}
                              <span>{num(nutr.calories)} kcal</span>
                              {cost.knownCount > 0 && <span className="price-tag">{money(cost.perServing)}</span>}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="num">{recipe.servings}</td>
                      <td className="num">{totalTime ? `${totalTime} min` : '—'}</td>
                      <td className="num">{num(nutr.calories)}</td>
                      <td className="num price-tag">{cost.knownCount ? money(cost.perServing) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {almost.length > 0 && (
        <>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="cart" size={14} /> Almost there</div>
          <div className="grid cols-2">
            {almost.map(({ recipe, coverage, missing }) => (
              <div key={recipe.id} className="card">
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Link to={`/recipes/${recipe.id}`}><strong>{recipe.title}</strong></Link>
                  <span className="chip accent">{Math.round(coverage * 100)}% in pantry</span>
                </div>
                <div className="bar" style={{ margin: '10px 0' }}><i style={{ width: `${coverage * 100}%` }} /></div>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span className="muted" style={{ fontSize: 13 }}>Missing {missing.length}:</span>
                  <button className="btn sm" onClick={() => { missing.forEach(({ line }) => addShoppingItem({ ingredientId: line.ingredientId, quantity: line.quantity, unit: line.unit, note: recipe.title })); notify(`Added ${missing.length} item${missing.length > 1 ? 's' : ''} to your shopping list.`, 'success') }}>
                    <Icon name="cart" size={13} /> Add all missing
                  </button>
                </div>
                <table>
                  <tbody>
                    {missing.map(({ line, ingredient, haveSome }, i) => (
                      <tr key={i}>
                        <td>{ingredient?.name || 'unknown'} {haveSome && <span className="chip" style={{ fontSize: 10 }}>low</span>}</td>
                        <td className="muted">{num(line.quantity)} {unitLabel(line.unit)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn ghost sm" onClick={() => addShoppingItem({ ingredientId: line.ingredientId, quantity: line.quantity, unit: line.unit, note: recipe.title })}>＋ list</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Tab 2 — goal-based weekly plan (macros, optional cost, vitamins, fiber)
// ---------------------------------------------------------------------------
function WeeklyPlan() {
  const { notify } = useDialogs()
  const recipes = useStore((s) => s.recipes)
  const ingredients = useStore((s) => s.ingredients)
  const { addMealPlan } = useStore()
  const ingredientsById = useMemo(() => Object.fromEntries(ingredients.map((i) => [i.id, i])), [ingredients])

  const [profileKey, setProfileKey] = useState('balanced')
  const [useCost, setUseCost] = useState(false)
  const [maxCost, setMaxCost] = useState('')
  const [vitamins, setVitamins] = useState([])
  const [useFiber, setUseFiber] = useState(false)
  const [week, setWeek] = useState(null)

  const opts = { profileKey, useCost, maxCost: Number(maxCost) || 0, vitamins, useFiber }
  const scored = useMemo(
    () => scoreRecipes(recipes, ingredientsById, opts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recipes, ingredientsById, profileKey, useCost, maxCost, vitamins, useFiber],
  )

  const toggleVitamin = (key) =>
    setVitamins((v) => (v.includes(key) ? v.filter((x) => x !== key) : [...v, key]))

  const generate = (shuffle) => {
    const w = buildWeek(scored, { shuffle })
    if (!w.length) {
      notify('No recipes have enough nutrition data to plan with — import some or fill in ingredient nutrition.', 'danger')
      return
    }
    setWeek(w)
  }

  const swapDay = (idx) => {
    setWeek((w) => {
      const used = new Set(w.map((d) => d.recipe.id))
      const next = scored.find((s) => !used.has(s.recipe.id)) ||
        scored.find((s) => s.recipe.id !== w[idx].recipe.id)
      if (!next) return w
      return w.map((d, i) => (i === idx ? { ...d, ...next } : d))
    })
  }

  const addToPlanner = () => {
    week.forEach((d) => addMealPlan(d.date, d.recipe.id, 'dinner'))
    notify('Week added to your meal planner as dinners.', 'success')
  }

  const avg = week
    ? week.reduce(
        (a, d) => ({
          calories: a.calories + d.per.calories / 7,
          protein: a.protein + (d.per.protein || 0) / 7,
          fiber: a.fiber + (d.per.fiber || 0) / 7,
          cost: d.costPerServing != null ? a.cost + d.costPerServing : a.cost,
        }),
        { calories: 0, protein: 0, fiber: 0, cost: 0 },
      )
    : null

  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row">
          <label className="field" style={{ minWidth: 190 }}><span>Macro focus</span>
            <select value={profileKey} onChange={(e) => setProfileKey(e.target.value)}>
              {MACRO_PROFILES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </label>
          <div className="field" style={{ minWidth: 200 }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Options</span>
            <label className="check-row" style={{ marginBottom: 8 }}>
              <input type="checkbox" checked={useCost} onChange={(e) => setUseCost(e.target.checked)} /> Prefer low cost
            </label>
            <label className="check-row">
              <input type="checkbox" checked={useFiber} onChange={(e) => setUseFiber(e.target.checked)} /> Prioritize fiber
            </label>
          </div>
          {useCost && (
            <label className="field" style={{ maxWidth: 180 }}><span>Max $/serving (optional)</span>
              <input type="number" min="0" step="0.5" placeholder="no cap" value={maxCost} onChange={(e) => setMaxCost(e.target.value)} />
            </label>
          )}
        </div>

        <div className="field">
          <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Vitamin & mineral focus (optional)</span>
          <div className="chips">
            {VITAMIN_OPTIONS.map((v) => (
              <span key={v.key} className={'chip tag' + (vitamins.includes(v.key) ? ' active' : '')} onClick={() => toggleVitamin(v.key)}>{v.label}</span>
            ))}
          </div>
        </div>

        <div className="row" style={{ marginTop: 4 }}>
          <button className="btn primary" style={{ flex: '0 0 auto' }} onClick={() => generate(false)}>
            <Icon name="sparkle" size={15} /> Build my week
          </button>
          {week && (
            <button className="btn" style={{ flex: '0 0 auto' }} onClick={() => generate(true)}>Shuffle</button>
          )}
        </div>
        <p className="muted" style={{ fontSize: 12.5, margin: '10px 0 0' }}>
          {scored.length} of {recipes.length} recipes have enough nutrition data to rank.
        </p>
      </div>

      {week && (
        <div className="card" style={{ padding: 0 }}>
          <div className="toolbar" style={{ justifyContent: 'space-between', padding: '14px 16px 0', marginBottom: 0 }}>
            <strong>Your week</strong>
            <button className="btn sm primary" onClick={addToPlanner}><Icon name="calendar" size={14} /> Add all to meal planner</button>
          </div>
          {week.map((d, i) => (
            <div key={d.date + d.recipe.id} className="plan-day">
              <span className="pd-dow">{fmtDate(d.date, 'EEE')}</span>
              <span className="pd-main">
                <Link to={`/recipes/${d.recipe.id}`} style={{ fontWeight: 600 }}>{d.recipe.title}</Link>
                <span className="pd-macros" style={{ marginTop: 3 }}>
                  <span><b>{num(d.per.calories)}</b> kcal</span>
                  <span><b>{num(d.per.protein)}g</b> protein</span>
                  <span><b>{num(d.per.carbs)}g</b> carbs</span>
                  <span><b>{num(d.per.fat)}g</b> fat</span>
                  {useFiber && <span><b>{num(d.per.fiber)}g</b> fiber</span>}
                  {vitamins.map((k) => {
                    const v = VITAMIN_OPTIONS.find((o) => o.key === k)
                    return <span key={k}><b>{num(d.per[k] || 0)}</b> {v.label.replace('Vitamin ', 'vit ')}</span>
                  })}
                  {d.costPerServing != null && <span className="price-tag">{money(d.costPerServing)}/serv</span>}
                </span>
              </span>
              <button className="btn ghost sm" style={{ flex: '0 0 auto' }} onClick={() => swapDay(i)} title="Swap this meal">
                <Icon name="merge" size={14} /> Swap
              </button>
            </div>
          ))}
          {avg && (
            <div className="plan-day" style={{ background: 'var(--hover)' }}>
              <span className="pd-dow" style={{ fontSize: 12.5, color: 'var(--muted)' }}>AVG</span>
              <span className="pd-main pd-macros">
                <span><b>{num(avg.calories)}</b> kcal/serving</span>
                <span><b>{num(avg.protein)}g</b> protein</span>
                {useFiber && <span><b>{num(avg.fiber)}g</b> fiber</span>}
                {useCost && avg.cost > 0 && <span className="price-tag">{money(avg.cost)}/week of dinners</span>}
              </span>
            </div>
          )}
        </div>
      )}
    </>
  )
}
