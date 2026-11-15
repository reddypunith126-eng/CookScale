import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, currentPricePerBase, ingredientUsage } from '../store.js'
import { money, num } from '../utils/format.js'
import { unitLabel } from '../utils/units.js'
import { PageHead, Empty, Modal } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { useDialogs } from '../components/Dialogs.jsx'

export default function Ingredients() {
  const ingredients = useStore((s) => s.ingredients)
  const recipes = useStore((s) => s.recipes)
  const cookLog = useStore((s) => s.cookLog)
  const { addIngredient, deleteIngredients } = useStore()
  const { confirm } = useDialogs()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('name')
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUnit, setNewUnit] = useState('g')
  const [selected, setSelected] = useState(() => new Set())

  const toggleSel = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const recipesById = useMemo(() => Object.fromEntries(recipes.map((r) => [r.id, r])), [recipes])
  const ingredientsById = useMemo(() => Object.fromEntries(ingredients.map((i) => [i.id, i])), [ingredients])
  const usage = useMemo(() => ingredientUsage(cookLog, recipesById, ingredientsById), [cookLog, recipesById, ingredientsById])

  const rows = useMemo(() => {
    let list = ingredients
      .filter((i) => i.name.toLowerCase().includes(query.toLowerCase()))
      .map((i) => ({
        i,
        price: currentPricePerBase(i),
        used: usage[i.id]?.baseQty || 0,
        cooks: usage[i.id]?.cookCount || 0,
      }))
    const sorters = {
      name: (a, b) => a.i.name.localeCompare(b.i.name),
      'price-desc': (a, b) => (b.price || 0) - (a.price || 0),
      'price-asc': (a, b) => (a.price || 0) - (b.price || 0),
      used: (a, b) => b.used - a.used,
      category: (a, b) => a.i.category.localeCompare(b.i.category),
    }
    return [...list].sort(sorters[sort])
  }, [ingredients, query, sort, usage])

  return (
    <>
      <PageHead title="Ingredients & prices" subtitle={`${ingredients.length} ingredients · prices tracked over time`}>
        <button className="btn primary" onClick={() => setAddOpen(true)}><Icon name="plus" size={16} /> New ingredient</button>
      </PageHead>

      <div className="toolbar">
        <input className="grow" placeholder="Search ingredients…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 'auto' }}>
          <option value="name">Name A–Z</option>
          <option value="category">Category</option>
          <option value="price-desc">Price ↓</option>
          <option value="price-asc">Price ↑</option>
          <option value="used">Most used</option>
        </select>
        {selected.size > 0 && (
          <>
            <span className="muted" style={{ fontSize: 13 }}>{selected.size} selected</span>
            <button className="btn danger" onClick={async () => {
              if (await confirm({ title: 'Delete ingredients?', message: `${selected.size} ingredient${selected.size > 1 ? 's' : ''} will be removed.`, danger: true, confirmLabel: 'Delete' })) { deleteIngredients([...selected]); setSelected(new Set()) }
            }}><Icon name="trash" size={15} /> Delete selected</button>
            <button className="btn ghost sm" onClick={() => setSelected(new Set())}>Clear</button>
          </>
        )}
      </div>

      {rows.length === 0 ? (
        <Empty icon="tag" title="No ingredients yet" />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 38 }}>
                  <input type="checkbox" style={{ width: 'auto' }}
                    checked={rows.length > 0 && rows.every(({ i }) => selected.has(i.id))}
                    onChange={(e) => setSelected(e.target.checked ? new Set(rows.map(({ i }) => i.id)) : new Set())} />
                </th>
                <th>Ingredient</th><th>Category</th><th style={{ textAlign: 'right' }}>Current price</th>
                <th style={{ textAlign: 'right' }}>Used (cooked)</th><th style={{ textAlign: 'right' }}># cooks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ i, price, used, cooks }) => (
                <tr key={i.id} className="clickable" onClick={() => navigate(`/ingredients/${i.id}`)}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" style={{ width: 'auto' }} checked={selected.has(i.id)} onChange={() => toggleSel(i.id)} />
                  </td>
                  <td style={{ fontWeight: 600 }}>{i.name}</td>
                  <td><span className="chip">{i.category}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    {price != null ? <span className="price-tag">{money(price * (i.baseUnit === 'each' ? 1 : 100))}<span className="muted" style={{ fontWeight: 400 }}>/{i.baseUnit === 'each' ? 'each' : '100' + unitLabel(i.baseUnit)}</span></span> : <span className="muted">no price</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>{used ? `${num(used)} ${unitLabel(i.baseUnit)}` : '—'}</td>
                  <td style={{ textAlign: 'right' }}>{cooks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {addOpen && (
        <Modal title="New ingredient" onClose={() => setAddOpen(false)}>
          <label className="field"><span>Name</span><input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} /></label>
          <label className="field"><span>Measured in</span>
            <select value={newUnit} onChange={(e) => setNewUnit(e.target.value)}>
              <option value="g">grams (mass)</option>
              <option value="ml">millilitres (volume)</option>
              <option value="each">each (count)</option>
            </select>
          </label>
          <button className="btn primary" onClick={() => {
            if (!newName.trim()) return
            const nid = addIngredient({ name: newName.trim(), baseUnit: newUnit })
            setAddOpen(false); setNewName(''); navigate(`/ingredients/${nid}`)
          }}>Create & edit details</button>
        </Modal>
      )}
    </>
  )
}
