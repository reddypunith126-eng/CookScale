import { useState } from 'react'
import { useStore } from '../store.js'
import { searchFoods, usdaToIngredientPatch } from '../utils/usda.js'
import { num } from '../utils/format.js'
import { Modal } from './ui.jsx'

// Search USDA FoodData Central and apply nutrition / serving / package data.
export default function UsdaSearch({ initialQuery = '', onApply, onClose }) {
  const apiKey = useStore((s) => s.settings.usdaApiKey) || 'DEMO_KEY'
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  async function run(e) {
    e?.preventDefault()
    if (!query.trim()) return
    setLoading(true); setStatus(''); setResults([])
    try {
      const foods = await searchFoods(query.trim(), apiKey)
      setResults(foods)
      if (!foods.length) setStatus('No matches found.')
    } catch (err) {
      setStatus('⚠ ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Look up nutrition — USDA FoodData Central" onClose={onClose}>
      <form className="row" onSubmit={run}>
        <input className="grow" autoFocus placeholder="e.g. chickpeas, canned" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="btn primary" style={{ flex: '0 0 auto' }} disabled={loading}>{loading ? 'Searching…' : 'Search'}</button>
      </form>
      {status && <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>{status}</p>}
      <div style={{ maxHeight: 380, overflowY: 'auto', marginTop: 12 }}>
        {results.map((f) => (
          <div key={f.fdcId} className="card" style={{ padding: 12, marginBottom: 8 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <strong style={{ fontSize: 14 }}>{f.name}</strong>
                <div className="muted" style={{ fontSize: 12 }}>
                  {f.brand ? f.brand + ' · ' : ''}{f.dataType}
                  {f.servingSize ? ` · serving ${f.servingSize}${f.servingSizeUnit}` : ''}
                  {f.householdServing ? ` (${f.householdServing})` : ''}
                </div>
                <div className="chips" style={{ marginTop: 6 }}>
                  <span className="chip">{num(f.nutritionPer100.calories || 0)} kcal/100{f.servingSizeUnit}</span>
                  <span className="chip">P {num(f.nutritionPer100.protein || 0)}</span>
                  <span className="chip">C {num(f.nutritionPer100.carbs || 0)}</span>
                  <span className="chip">F {num(f.nutritionPer100.fat || 0)}</span>
                  <span className="chip">fiber {num(f.nutritionPer100.fiber || 0)}</span>
                </div>
              </div>
              <button className="btn sm primary" style={{ flex: '0 0 auto' }} onClick={() => onApply(usdaToIngredientPatch(f), f)}>Use this</button>
            </div>
          </div>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
        Public USDA data via the shared DEMO_KEY. For heavier use, add your own free key in Settings.
      </p>
    </Modal>
  )
}
