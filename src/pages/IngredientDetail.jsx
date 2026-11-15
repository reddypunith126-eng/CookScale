import { useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useStore, currentPricePerBase, ingredientUsage } from '../store.js'
import { NUTRIENTS } from '../utils/nutrition.js'
import { money, num, fmtDate, todayISO } from '../utils/format.js'
import { unitLabel, UNITS_BY_CATEGORY, unitCategory } from '../utils/units.js'
import { servingSizeOf, describePackage } from '../utils/packaging.js'
import { PageHead, BackLink, Modal } from '../components/ui.jsx'
import UsdaSearch from '../components/UsdaSearch.jsx'
import Icon from '../components/Icon.jsx'
import { useDialogs } from '../components/Dialogs.jsx'
import { useChart, tooltipStyle } from '../theme.js'

export default function IngredientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const ing = useStore((s) => s.ingredients.find((i) => i.id === id))
  const recipes = useStore((s) => s.recipes)
  const cookLog = useStore((s) => s.cookLog)
  const { updateIngredient, deleteIngredient, addPurchase } = useStore()
  const c = useChart()
  const TT = tooltipStyle(c)
  const { confirm } = useDialogs()
  const [buyOpen, setBuyOpen] = useState(false)
  const [editNutr, setEditNutr] = useState(false)
  const [usdaOpen, setUsdaOpen] = useState(false)

  const recipesById = useMemo(() => Object.fromEntries(recipes.map((r) => [r.id, r])), [recipes])
  const ingredientsById = useMemo(() => (ing ? { [ing.id]: ing } : {}), [ing])
  const usage = useMemo(() => ingredientUsage(cookLog, recipesById, ingredientsById)[id], [cookLog, recipesById, ingredientsById, id])

  if (!ing) return <div className="empty">Ingredient not found. <Link to="/ingredients">Back</Link></div>

  const unitsBase = ing.baseUnit === 'each' ? 1 : 100
  const baseLabel = ing.baseUnit === 'each' ? 'each' : '100' + unitLabel(ing.baseUnit)
  const ppb = currentPricePerBase(ing)

  const chartData = [...ing.priceHistory]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((h) => ({ date: fmtDate(h.date, 'MMM d'), price: +(h.pricePerBase * unitsBase).toFixed(4), store: h.store }))

  const usedInRecipes = recipes.filter((r) => r.ingredients.some((l) => l.ingredientId === id))

  return (
    <>
      <BackLink to="/ingredients">All ingredients</BackLink>
      <PageHead title={ing.name} subtitle={`${ing.brand ? ing.brand + ' · ' : ''}Measured in ${unitLabel(ing.baseUnit)} · ${ing.category}`}>
        <button className="btn" onClick={() => setUsdaOpen(true)}><Icon name="leaf" size={15} /> USDA lookup</button>
        <button className="btn" onClick={() => setEditNutr(true)}><Icon name="pencil" size={15} /> Edit details</button>
        <button className="btn primary" onClick={() => setBuyOpen(true)}><Icon name="plus" size={16} /> Log purchase</button>
      </PageHead>

      <div className="grid cols-4" style={{ marginBottom: 20 }}>
        <div className="card stat"><span className="label">Current price</span><span className="value price-tag">{ppb != null ? money(ppb * unitsBase) : '—'}</span><span className="sub">per {baseLabel}</span></div>
        <div className="card stat"><span className="label">Price points</span><span className="value">{ing.priceHistory.filter((h) => h.pricePerBase > 0).length}</span><span className="sub">tracked over time</span></div>
        <div className="card stat"><span className="label">Serving size</span><span className="value">{ing.servingSize ? num(ing.servingSize) : num(servingSizeOf(ing))}<span style={{ fontSize: 15 }}> {ing.baseUnit === 'each' ? 'each' : unitLabel(ing.baseUnit)}</span></span><span className="sub">{ing.servingSize ? 'from USDA' : 'default estimate'}</span></div>
        <div className="card stat"><span className="label">Total cooked</span><span className="value">{usage ? num(usage.baseQty) : 0}<span style={{ fontSize: 15 }}> {unitLabel(ing.baseUnit)}</span></span><span className="sub">across {usage?.cookCount || 0} cooks</span></div>
      </div>

      <div className="grid split">
        <div className="card">
          <strong>Price per {baseLabel} over time</strong>
          {chartData.length > 1 ? (
            <div style={{ height: 240, marginTop: 16 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ left: -10, right: 10, top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                  <XAxis dataKey="date" fontSize={12} stroke={c.axis} />
                  <YAxis fontSize={12} stroke={c.axis} tickFormatter={(v) => '$' + v} />
                  <Tooltip {...TT} formatter={(v) => money(v)} />
                  <Line type="monotone" dataKey="price" stroke={c.line} strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="muted" style={{ marginTop: 12 }}>Log at least two purchases to see a price trend.</p>
          )}
          <hr className="divider" />
          <table>
            <thead><tr><th>Date</th><th>Store</th><th style={{ textAlign: 'right' }}>Price / {baseLabel}</th></tr></thead>
            <tbody>
              {[...ing.priceHistory].sort((a, b) => b.date.localeCompare(a.date)).map((h, i) => (
                <tr key={i}><td>{fmtDate(h.date)}</td><td className="muted">{h.store || '—'}</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{money(h.pricePerBase * unitsBase)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <strong>Nutrition <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>per {baseLabel}</span></strong>
          <table style={{ marginTop: 12 }}>
            <tbody>
              {NUTRIENTS.map((nu) => (
                <tr key={nu.key}>
                  <td style={{ padding: '6px 10px' }}>{nu.label}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600 }}>{num(ing.nutritionPer100?.[nu.key] || 0)} {nu.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {ing.packages?.length > 0 && (
            <>
              <hr className="divider" />
              <strong style={{ fontSize: 13 }}>Packaging</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13 }} className="muted">
                {ing.packages.map((pkg, i) => <li key={i}>{describePackage(ing, pkg)}</li>)}
              </ul>
            </>
          )}
          {usedInRecipes.length > 0 && (
            <>
              <hr className="divider" />
              <strong style={{ fontSize: 13 }}>Used in</strong>
              <div className="chips" style={{ marginTop: 8 }}>
                {usedInRecipes.map((r) => <Link key={r.id} to={`/recipes/${r.id}`} className="chip accent">{r.title}</Link>)}
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <button className="btn danger sm" onClick={async () => { if (await confirm({ title: 'Delete ingredient?', message: `"${ing.name}" will be removed.`, danger: true, confirmLabel: 'Delete' })) { deleteIngredient(id); navigate('/ingredients') } }}>Delete ingredient</button>
      </div>

      {buyOpen && <BuyModal ing={ing} onClose={() => setBuyOpen(false)} onBuy={(data) => { addPurchase({ ingredientId: id, ...data }); setBuyOpen(false) }} />}
      {editNutr && <NutritionEditor ing={ing} onClose={() => setEditNutr(false)} onSave={(patch) => { updateIngredient(id, patch); setEditNutr(false) }} />}
      {usdaOpen && (
        <UsdaSearch
          initialQuery={ing.name}
          onClose={() => setUsdaOpen(false)}
          onApply={(patch) => { updateIngredient(id, { ...patch, packages: [...(ing.packages || []), ...(patch.packages || [])] }); setUsdaOpen(false) }}
        />
      )}
    </>
  )
}

function BuyModal({ ing, onClose, onBuy }) {
  const cat = unitCategory(ing.baseUnit)
  const units = UNITS_BY_CATEGORY[cat] || [ing.baseUnit]
  const [date, setDate] = useState(todayISO())
  const [totalPrice, setTotalPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState(ing.baseUnit)
  const [store, setStore] = useState('')
  return (
    <Modal title={`Log purchase · ${ing.name}`} onClose={onClose}>
      <div className="row">
        <label className="field"><span>Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="field"><span>Store</span><input value={store} onChange={(e) => setStore(e.target.value)} placeholder="optional" /></label>
      </div>
      <div className="row">
        <label className="field"><span>Quantity bought</span><input type="number" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label>
        <label className="field"><span>Unit</span><select value={unit} onChange={(e) => setUnit(e.target.value)}>{units.map((u) => <option key={u} value={u}>{u}</option>)}</select></label>
        <label className="field"><span>Total price ($)</span><input type="number" step="any" value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} /></label>
      </div>
      <button className="btn primary" disabled={!quantity || !totalPrice} onClick={() => onBuy({ date, totalPrice: Number(totalPrice), quantity: Number(quantity), unit, store })}>Save purchase</button>
    </Modal>
  )
}

function NutritionEditor({ ing, onClose, onSave }) {
  const [name, setName] = useState(ing.name)
  const [category, setCategory] = useState(ing.category)
  const [servingSize, setServingSize] = useState(ing.servingSize ?? '')
  const [density, setDensity] = useState(ing.density ?? '')
  const [nutr, setNutr] = useState({ ...ing.nutritionPer100 })
  const [packages, setPackages] = useState(ing.packages || [])
  const baseLabel = ing.baseUnit === 'each' ? 'each' : '100' + unitLabel(ing.baseUnit)
  const units = UNITS_BY_CATEGORY[unitCategory(ing.baseUnit)] || [ing.baseUnit]

  const updatePkg = (i, patch) => setPackages((p) => p.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
  return (
    <Modal title={`Edit ${ing.name}`} onClose={onClose}>
      <div className="row">
        <label className="field" style={{ flex: 2 }}><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field"><span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {['produce', 'dairy', 'meat', 'pantry', 'baking', 'spice', 'frozen', 'beverage', 'other'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="field"><span>Serving size ({ing.baseUnit === 'each' ? 'each' : unitLabel(ing.baseUnit)})</span>
          <input type="number" step="any" value={servingSize} onChange={(e) => setServingSize(e.target.value)} placeholder="e.g. 130" />
        </label>
        <label className="field"><span>Density (g/ml)</span>
          <input type="number" step="any" value={density} onChange={(e) => setDensity(e.target.value)} placeholder="auto" title="Used to convert cups/tsp/tbsp to grams" />
        </label>
      </div>

      <div className="section-title">Packaging (formatted intake)</div>
      {packages.map((pkg, i) => (
        <div key={i} className="row" style={{ marginBottom: 6, alignItems: 'center' }}>
          <input style={{ flex: 2 }} placeholder="label e.g. can" value={pkg.label} onChange={(e) => updatePkg(i, { label: e.target.value })} />
          <input style={{ flex: 1 }} type="number" step="any" placeholder="qty" value={pkg.quantity} onChange={(e) => updatePkg(i, { quantity: Number(e.target.value) })} />
          <select style={{ flex: 1 }} value={pkg.unit} onChange={(e) => updatePkg(i, { unit: e.target.value })}>{units.map((u) => <option key={u} value={u}>{u}</option>)}</select>
          <button className="btn ghost sm" style={{ flex: '0 0 auto' }} onClick={() => setPackages((p) => p.filter((_, idx) => idx !== i))}>✕</button>
        </div>
      ))}
      <button className="btn sm" onClick={() => setPackages((p) => [...p, { label: '', quantity: 1, unit: ing.baseUnit }])}>＋ Add package</button>

      <div className="section-title">Nutrition per {baseLabel}</div>
      <div className="grid cols-3">
        {NUTRIENTS.map((nu) => (
          <label key={nu.key} className="field" style={{ marginBottom: 4 }}>
            <span>{nu.label} ({nu.unit})</span>
            <input type="number" step="any" value={nutr[nu.key] ?? ''} onChange={(e) => setNutr((n) => ({ ...n, [nu.key]: Number(e.target.value) }))} />
          </label>
        ))}
      </div>
      <button className="btn primary" style={{ marginTop: 10 }} onClick={() => onSave({ name, category, nutritionPer100: nutr, servingSize: servingSize === '' ? null : Number(servingSize), density: density === '' ? null : Number(density), packages: packages.filter((p) => p.label) })}>Save</button>
    </Modal>
  )
}
