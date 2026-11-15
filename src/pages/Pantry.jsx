import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store.js'
import { unitCategory, UNITS_BY_CATEGORY, convert, toBase, unitLabel } from '../utils/units.js'
import { num } from '../utils/format.js'
import { servingsFor, servingSizeOf, describePackage } from '../utils/packaging.js'
import { PageHead, Empty } from '../components/ui.jsx'

export default function Pantry() {
  const pantry = useStore((s) => s.pantry)
  const ingredients = useStore((s) => s.ingredients)
  const { setPantryItem, removePantryItem } = useStore()
  const [addId, setAddId] = useState('')

  const ingredientsById = useMemo(() => Object.fromEntries(ingredients.map((i) => [i.id, i])), [ingredients])
  const notInPantry = ingredients.filter((i) => !pantry.some((p) => p.ingredientId === i.id))

  // Add a package (or one base unit) to the pantry, merging into existing stock.
  function addPackage(ingredientId, pkg) {
    const ing = ingredientsById[ingredientId]
    const existing = pantry.find((p) => p.ingredientId === ingredientId)
    const targetUnit = existing?.unit || ing.baseUnit
    const addQty = pkg ? (convert(pkg.quantity, pkg.unit, targetUnit) ?? pkg.quantity) : 1
    setPantryItem(ingredientId, (existing?.quantity || 0) + addQty, targetUnit)
  }

  const byCategory = useMemo(() => {
    const groups = {}
    for (const p of pantry) {
      const ing = ingredientsById[p.ingredientId]
      const cat = ing?.category || 'other'
      ;(groups[cat] ||= []).push({ p, ing })
    }
    return groups
  }, [pantry, ingredientsById])

  const addIng = ingredientsById[addId]

  return (
    <>
      <PageHead title="Pantry" subtitle={`${pantry.length} ingredients on hand · drives recommendations & shopping`} />

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <label className="field" style={{ marginBottom: 0, flex: 2 }}><span>Add an ingredient to your pantry</span>
            <select value={addId} onChange={(e) => setAddId(e.target.value)}>
              <option value="">— select ingredient —</option>
              {notInPantry.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </label>
          <button className="btn primary" style={{ flex: '0 0 auto' }} disabled={!addId} onClick={() => { addPackage(addId, null); setAddId('') }}>Add</button>
        </div>
        {addIng && (addIng.packages?.length > 0) && (
          <div className="chips" style={{ marginTop: 12 }}>
            <span className="muted" style={{ fontSize: 13 }}>Add by package:</span>
            {addIng.packages.map((pkg, i) => (
              <span key={i} className="chip tag" style={{ cursor: 'pointer' }} onClick={() => { addPackage(addId, pkg); setAddId('') }} title={describePackage(addIng, pkg)}>
                ＋ 1 {pkg.label} ({pkg.quantity}{unitLabel(pkg.unit)})
              </span>
            ))}
          </div>
        )}
      </div>

      {pantry.length === 0 ? (
        <Empty icon="box" title="Your pantry is empty" />
      ) : (
        Object.entries(byCategory).sort().map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 18 }}>
            <div className="section-title" style={{ marginTop: 0 }}>{cat}</div>
            <div className="card" style={{ padding: 0 }}>
              <table>
                <thead><tr><th>Ingredient</th><th style={{ width: 130 }}>Quantity</th><th style={{ width: 100 }}>Unit</th><th>Intake</th><th style={{ width: 150 }}>Quick add</th><th style={{ width: 50 }}></th></tr></thead>
                <tbody>
                  {items.map(({ p, ing }) => {
                    const units = UNITS_BY_CATEGORY[unitCategory(p.unit)] || [p.unit]
                    const servings = ing ? servingsFor(ing, p.quantity, p.unit) : null
                    const size = ing ? servingSizeOf(ing) : null
                    return (
                      <tr key={p.ingredientId}>
                        <td style={{ fontWeight: 600 }}>{ing ? <Link to={`/ingredients/${ing.id}`}>{ing.name}</Link> : 'Unknown'}</td>
                        <td><input type="number" step="any" value={p.quantity} onChange={(e) => setPantryItem(p.ingredientId, Number(e.target.value), p.unit)} /></td>
                        <td>
                          <select value={p.unit} onChange={(e) => setPantryItem(p.ingredientId, p.quantity, e.target.value)}>
                            {units.map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td className="muted" style={{ fontSize: 13 }}>
                          {servings != null ? <><b style={{ color: 'var(--text)' }}>~{num(servings)} servings</b> · {size}{ing.baseUnit === 'each' ? '' : unitLabel(ing.baseUnit)}/serving</> : '—'}
                        </td>
                        <td>
                          {ing?.packages?.length > 0 ? (
                            <div className="chips">
                              {ing.packages.slice(0, 2).map((pkg, i) => (
                                <span key={i} className="chip tag" style={{ cursor: 'pointer' }} onClick={() => addPackage(p.ingredientId, pkg)} title={describePackage(ing, pkg)}>＋{pkg.label}</span>
                              ))}
                            </div>
                          ) : <span className="muted" style={{ fontSize: 12 }}>—</span>}
                        </td>
                        <td style={{ textAlign: 'right' }}><button className="btn ghost sm" onClick={() => removePantryItem(p.ingredientId)}>✕</button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </>
  )
}
