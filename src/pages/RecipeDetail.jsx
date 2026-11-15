import { useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useStore, recipeCost, lineCost } from '../store.js'
import { resolvePerServing } from '../utils/nutrition.js'
import { money, num, todayISO, fmtDate } from '../utils/format.js'
import { unitLabel, unitCategory, formatQuantity } from '../utils/units.js'
import { gramsForLine } from '../utils/density.js'
import { Stars, BackLink, Modal, Drawer } from '../components/ui.jsx'
import NutritionPanel from '../components/NutritionPanel.jsx'
import CookMode from '../components/CookMode.jsx'
import Icon from '../components/Icon.jsx'
import { useDialogs } from '../components/Dialogs.jsx'

export default function RecipeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const recipe = useStore((s) => s.recipes.find((r) => r.id === id))
  const ingredients = useStore((s) => s.ingredients)
  const cookLog = useStore((s) => s.cookLog)
  const { logCook, deleteRecipe, updateRecipe, addShoppingItem, addMealPlan } = useStore()
  const { confirm } = useDialogs()
  const ingredientsById = useMemo(() => Object.fromEntries(ingredients.map((i) => [i.id, i])), [ingredients])

  const [scale, setScale] = useState(1)
  const [cookOpen, setCookOpen] = useState(false)
  const [cookModeOpen, setCookModeOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const [nutriOpen, setNutriOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  if (!recipe) return <div className="empty">Recipe not found. <Link to="/recipes">Back to recipes</Link></div>

  const cost = recipeCost(recipe, ingredientsById)
  const perServing = resolvePerServing(recipe, ingredientsById)
  const scaledServings = Math.round(recipe.servings * scale)
  const cooks = cookLog.filter((c) => c.recipeId === id).sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      <BackLink to="/recipes">All recipes</BackLink>
      <div className="masthead">
        <div className="mh-top">
          <div className="mh-title">
            <div className="mh-eyebrow">{(recipe.tags || [])[0] || 'Recipe'} · {recipe.servings} servings</div>
            <h1>{recipe.title}</h1>
          </div>
          <div className="mh-actions">
            <button className="btn" onClick={() => updateRecipe(id, { favorite: !recipe.favorite })} title={recipe.favorite ? 'Favorited' : 'Favorite'}>
              <Icon name="heart" size={15} fill={recipe.favorite} style={recipe.favorite ? { color: 'var(--seal)' } : undefined} /> {recipe.favorite ? 'Favorited' : 'Favorite'}
            </button>
            <button className="btn" onClick={() => setNutriOpen(true)}>Nutrition</button>
            <Link to={`/recipes/${id}/edit`} className="btn"><Icon name="pencil" size={15} /> Edit</Link>
            <button className="btn" onClick={() => setCookOpen(true)}>Quick log</button>
            <button className="btn primary" onClick={() => setCookModeOpen(true)}><Icon name="flame" size={16} /> Cook this</button>
          </div>
        </div>
        {(recipe.tags || []).length > 0 && (
          <div className="chips" style={{ marginTop: 12 }}>{recipe.tags.map((t) => <span key={t} className="chip tag">{t}</span>)}</div>
        )}
        <div className="mh-spec">
          <div><div className="s-label">Cost / serving</div><div className="s-value price-tag">{cost.knownCount ? money(cost.perServing) : '—'}</div></div>
          <div><div className="s-label">Total cost</div><div className="s-value">{money(cost.total)} <small>· {recipe.servings} serv</small></div></div>
          <div><div className="s-label">Calories</div><div className="s-value">{num(perServing.calories)} <small>· {num(perServing.protein)}g pro</small></div></div>
          <div><div className="s-label">Time</div><div className="s-value">{(recipe.prepTime || 0) + (recipe.cookTime || 0)} <small>min</small></div></div>
        </div>
      </div>

      <div className="grid split">
        <div className="card">
          <div className="toolbar" style={{ marginBottom: 14, justifyContent: 'space-between' }}>
            <strong>Ingredients</strong>
            <div className="row" style={{ flex: '0 0 auto', alignItems: 'center', gap: 8 }}>
              <span className="muted" style={{ fontSize: 13 }}>Scale to</span>
              <select value={scale} onChange={(e) => setScale(Number(e.target.value))} style={{ width: 'auto' }}>
                {[0.5, 1, 1.5, 2, 3, 4].map((m) => (
                  <option key={m} value={m}>{m}× ({Math.round(recipe.servings * m)} serv)</option>
                ))}
              </select>
            </div>
          </div>
          <table>
            <tbody>
              {recipe.ingredients.map((line, i) => {
                const ing = ingredientsById[line.ingredientId]
                const c = lineCost(line, ing)
                const grams = unitCategory(line.unit) === 'volume' ? gramsForLine(line, ing) : null
                return (
                  <tr key={i}>
                    <td style={{ width: 120, fontWeight: 600 }}>
                      {formatQuantity(line.quantity * scale, line.unit)} {unitLabel(line.unit)}
                      {grams != null && <div className="muted" style={{ fontWeight: 400, fontSize: 12 }}>≈ {num(grams * scale)} g</div>}
                    </td>
                    <td>
                      {ing ? <Link to={`/ingredients/${ing.id}`}>{ing.name}</Link> : <span className="muted">unknown</span>}
                      {line.note && <span className="muted"> · {line.note}</span>}
                    </td>
                    <td style={{ textAlign: 'right' }} className="muted">{c != null ? money(c * scale) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <hr className="divider" />
          <div className="row" style={{ alignItems: 'center' }}>
            <button className="btn sm" onClick={() => {
              recipe.ingredients.forEach((line) =>
                addShoppingItem({ ingredientId: line.ingredientId, quantity: line.quantity * scale, unit: line.unit, note: recipe.title }))
              navigate('/shopping')
            }}><Icon name="cart" size={14} /> Add all to shopping list</button>
            <button className="btn sm" onClick={() => setPlanOpen(true)}><Icon name="calendar" size={14} /> Add to meal plan</button>
          </div>
        </div>

        <div className="card">
          <strong>Method</strong>
          <ol className="method" style={{ marginTop: 14 }}>
            {(recipe.instructions || []).map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          {recipe.sourceUrl && <p className="muted" style={{ fontSize: 13 }}>Source: <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">{recipe.sourceUrl}</a></p>}
        </div>
      </div>

      <div className="detail-foot">
        <div className="muted" style={{ fontSize: 13 }}>
          {cooks.length > 0
            ? <>Cooked {cooks.length}× · last {fmtDate(cooks[0].date)}. <button className="linkish" onClick={() => setHistoryOpen(true)}>View history</button></>
            : 'Not cooked yet.'}
        </div>
        <button className="btn danger sm" onClick={async () => { if (await confirm({ title: 'Delete recipe?', message: `"${recipe.title}" will be permanently removed.`, danger: true, confirmLabel: 'Delete' })) { deleteRecipe(id); navigate('/recipes') } }}>Delete recipe</button>
      </div>

      {nutriOpen && (
        <Drawer title="Nutrition" onClose={() => setNutriOpen(false)}>
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>Per serving · {recipe.servings} servings per batch.</p>
          <div style={{ marginTop: 14 }}>
            <NutritionPanel nutrition={perServing} label="Per serving" />
          </div>
        </Drawer>
      )}
      {historyOpen && (
        <Drawer title="Cook history" onClose={() => setHistoryOpen(false)}>
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>{cooks.length} cook{cooks.length === 1 ? '' : 's'} logged. Each cook deducts ingredients from your pantry.</p>
          <table style={{ marginTop: 14 }}>
            <thead><tr><th>Date</th><th className="num">Servings</th></tr></thead>
            <tbody>
              {cooks.map((ck, i) => (
                <tr key={i}><td>{fmtDate(ck.date)}</td><td className="num">{ck.servings}</td></tr>
              ))}
            </tbody>
          </table>
        </Drawer>
      )}

      {cookModeOpen && (
        <CookMode
          recipe={recipe}
          ingredientsById={ingredientsById}
          onClose={() => setCookModeOpen(false)}
          onLogged={(servings, date) => { logCook(id, date, servings); setCookModeOpen(false) }}
        />
      )}
      {cookOpen && <CookModal recipe={recipe} onClose={() => setCookOpen(false)} onLog={(date, servings) => { logCook(id, date, servings); setCookOpen(false) }} />}
      {planOpen && <PlanModal onClose={() => setPlanOpen(false)} onAdd={(date, meal) => { addMealPlan(date, id, meal); setPlanOpen(false); navigate('/planner') }} />}
    </>
  )
}

function CookModal({ recipe, onClose, onLog }) {
  const [date, setDate] = useState(todayISO())
  const [servings, setServings] = useState(recipe.servings)
  return (
    <Modal title={`Log a cook · ${recipe.title}`} onClose={onClose}>
      <label className="field"><span>Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <label className="field"><span>Servings made</span><input type="number" min="1" value={servings} onChange={(e) => setServings(Number(e.target.value))} /></label>
      <p className="muted" style={{ fontSize: 13 }}>This records the cook for your dashboard and deducts the used ingredients from your pantry.</p>
      <button className="btn primary" onClick={() => onLog(date, servings)}>Log cook</button>
    </Modal>
  )
}

function PlanModal({ onClose, onAdd }) {
  const [date, setDate] = useState(todayISO())
  const [meal, setMeal] = useState('dinner')
  return (
    <Modal title="Add to meal plan" onClose={onClose}>
      <label className="field"><span>Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <label className="field"><span>Meal</span>
        <select value={meal} onChange={(e) => setMeal(e.target.value)}>
          <option>breakfast</option><option>lunch</option><option>dinner</option><option>snack</option>
        </select>
      </label>
      <button className="btn primary" onClick={() => onAdd(date, meal)}>Add to plan</button>
    </Modal>
  )
}
