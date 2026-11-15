import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { startOfWeek, startOfMonth, startOfYear, format, parseISO, eachMonthOfInterval } from 'date-fns'
import { useStore, recipeCost } from '../store.js'
import { resolvePerServing, addNutrition, emptyNutrition, NUTRIENTS, MACRO_KEYS } from '../utils/nutrition.js'
import { money, num, today } from '../utils/format.js'
import { PageHead, Drawer } from '../components/ui.jsx'
import { useChart, tooltipStyle } from '../theme.js'

const TODAY = today()

const PERIODS = {
  week: { label: 'This week', start: () => startOfWeek(TODAY, { weekStartsOn: 1 }), days: 7 },
  month: { label: 'This month', start: () => startOfMonth(TODAY), days: 30 },
  year: { label: 'This year', start: () => startOfYear(TODAY), days: 365 },
}

export default function Dashboard() {
  const recipes = useStore((s) => s.recipes)
  const ingredients = useStore((s) => s.ingredients)
  const cookLog = useStore((s) => s.cookLog)
  const purchases = useStore((s) => s.purchases)
  const [period, setPeriod] = useState('month')
  const [nutriOpen, setNutriOpen] = useState(false)
  const navigate = useNavigate()
  const c = useChart()
  const TT = tooltipStyle(c)

  const recipesById = useMemo(() => Object.fromEntries(recipes.map((r) => [r.id, r])), [recipes])
  const ingredientsById = useMemo(() => Object.fromEntries(ingredients.map((i) => [i.id, i])), [ingredients])

  const rangeStart = PERIODS[period].start()
  const startISO = format(rangeStart, 'yyyy-MM-dd')
  const periodDays = PERIODS[period].days

  // ---- Cooks in range ----
  const cooksInRange = cookLog.filter((c) => c.date >= startISO)
  const periodNutrition = useMemo(() => {
    let total = emptyNutrition()
    for (const c of cooksInRange) {
      const r = recipesById[c.recipeId]
      if (!r) continue
      const per = resolvePerServing(r, ingredientsById)
      total = addNutrition(total, per, c.servings)
    }
    return total
  }, [cooksInRange, recipesById, ingredientsById])

  // ---- Grocery spend in range ----
  const purchasesInRange = purchases.filter((p) => p.date >= startISO)
  const totalSpend = purchasesInRange.reduce((a, p) => a + p.totalPrice, 0)
  const avgPurchase = purchasesInRange.length ? totalSpend / purchasesInRange.length : 0
  const avgCostPerMeal = useMemo(() => {
    const costs = cooksInRange.map((c) => {
      const r = recipesById[c.recipeId]
      return r ? recipeCost(r, ingredientsById).perServing * c.servings : 0
    })
    const totalServings = cooksInRange.reduce((a, c) => a + c.servings, 0)
    return totalServings ? costs.reduce((a, b) => a + b, 0) / totalServings : 0
  }, [cooksInRange, recipesById, ingredientsById])

  // ---- Monthly trend (whole year) ----
  const months = eachMonthOfInterval({ start: startOfYear(TODAY), end: TODAY })
  const trend = months.map((m) => {
    const key = format(m, 'yyyy-MM')
    const cooks = cookLog.filter((c) => c.date.startsWith(key))
    const spend = purchases.filter((p) => p.date.startsWith(key)).reduce((a, p) => a + p.totalPrice, 0)
    return { month: format(m, 'MMM'), cooks: cooks.length, spend: +spend.toFixed(2) }
  })

  // ---- Macro pie ----
  const macroPie = MACRO_KEYS.map((k, i) => ({ name: k, value: +periodNutrition[k].toFixed(0), color: c.macros[i] }))
    .filter((d) => d.value > 0)

  // ---- Most cooked ----
  const cookCounts = {}
  for (const c of cookLog) cookCounts[c.recipeId] = (cookCounts[c.recipeId] || 0) + 1
  const topRecipes = Object.entries(cookCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const perDay = (key) => periodNutrition[key] / periodDays

  return (
    <>
      <PageHead title="Dashboard" subtitle="Your kitchen at a glance">
        <select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Time period">
          {Object.entries(PERIODS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </PageHead>

      <div className="kpi" style={{ marginBottom: 16 }}>
        <div>
          <span className="k-label">Recipes made</span>
          <span className="k-value">{cooksInRange.length}</span>
          <span className="k-sub">{cooksInRange.reduce((a, c) => a + c.servings, 0)} servings</span>
        </div>
        <div>
          <span className="k-label">Grocery spend</span>
          <span className="k-value">{money(totalSpend)}</span>
          <span className="k-sub">avg {money(avgPurchase)} / trip</span>
        </div>
        <div>
          <span className="k-label">Avg cost / meal</span>
          <span className="k-value">{money(avgCostPerMeal)}</span>
          <span className="k-sub">per serving cooked</span>
        </div>
        <div>
          <span className="k-label">Calories / day</span>
          <span className="k-value">{num(perDay('calories'), 0)}</span>
          <span className="k-sub">{num(perDay('protein'), 0)}g protein / day</span>
        </div>
      </div>

      <div className="grid cols-2" style={{ marginBottom: 18 }}>
        <div className="card">
          <strong>Recipes cooked per month</strong>
          <div style={{ height: 230, marginTop: 14 }}>
            <ResponsiveContainer>
              <BarChart data={trend} margin={{ left: -16, right: 8, top: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                <XAxis dataKey="month" fontSize={12} stroke={c.axis} />
                <YAxis fontSize={12} stroke={c.axis} allowDecimals={false} />
                <Tooltip {...TT} />
                <Bar dataKey="cooks" fill={c.cooks} radius={[4, 4, 0, 0]} name="Cooks" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <strong>Grocery spend per month</strong>
          <div style={{ height: 230, marginTop: 14 }}>
            <ResponsiveContainer>
              <BarChart data={trend} margin={{ left: -8, right: 8, top: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                <XAxis dataKey="month" fontSize={12} stroke={c.axis} />
                <YAxis fontSize={12} stroke={c.axis} tickFormatter={(v) => '$' + v} />
                <Tooltip {...TT} formatter={(v) => money(v)} />
                <Bar dataKey="spend" fill={c.spend} radius={[4, 4, 0, 0]} name="Spend" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid split" style={{ marginBottom: 16 }}>
        <div className="card">
          <strong>Most cooked recipes</strong>
          <table style={{ marginTop: 12 }}>
            <tbody>
              {topRecipes.length === 0 && <tr><td className="muted">No cooks logged yet.</td></tr>}
              {topRecipes.map(([rid, count]) => {
                const r = recipesById[rid]
                if (!r) return null
                const cost = recipeCost(r, ingredientsById)
                return (
                  <tr key={rid} className="clickable" onClick={() => navigate(`/recipes/${rid}`)}>
                    <td style={{ fontWeight: 600 }}>{r.title}</td>
                    <td className="muted num">{count}×</td>
                    <td className="num price-tag">{money(cost.perServing)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <strong>Nutrition <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>· {PERIODS[period].label.toLowerCase()}</span></strong>
          {macroPie.length ? (
            <>
              <div className="macro-stack" style={{ marginTop: 16 }}>
                {macroPie.map((d) => <i key={d.name} style={{ background: d.color, flex: d.value }} title={`${d.name} ${num(d.value, 0)}g`} />)}
              </div>
              <div className="macro-legend">
                {macroPie.map((d) => (
                  <span key={d.name}><span className="macro-dot" style={{ background: d.color }} />{d.name} <b>{num(d.value, 0)}g</b></span>
                ))}
              </div>
              <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{num(perDay('calories'), 0)} kcal · {num(perDay('protein'), 0)}g protein per day</div>
                <button className="btn sm" onClick={() => setNutriOpen(true)}>Full breakdown →</button>
              </div>
            </>
          ) : <p className="muted" style={{ marginTop: 12 }}>No cooks logged in this period.</p>}
        </div>
      </div>

      {nutriOpen && (
        <Drawer title="Nutrient breakdown" onClose={() => setNutriOpen(false)}>
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>{PERIODS[period].label} · per-day average and period total.</p>
          <table style={{ marginTop: 14 }}>
            <thead><tr><th>Nutrient</th><th className="num">Per day</th><th className="num">Total</th></tr></thead>
            <tbody>
              {NUTRIENTS.map((nu) => (
                <tr key={nu.key}>
                  <td>{nu.label}</td>
                  <td className="num" style={{ fontWeight: 600 }}>{num(perDay(nu.key), nu.key === 'calories' ? 0 : 1)} {nu.unit}</td>
                  <td className="num muted">{num(periodNutrition[nu.key], 0)} {nu.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Drawer>
      )}
    </>
  )
}
