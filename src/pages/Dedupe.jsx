import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store.js'
import { findDuplicateIngredients, findDuplicateRecipes } from '../utils/dedupe.js'
import { PageHead, Empty } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { useDialogs } from '../components/Dialogs.jsx'

function IngredientGroup({ group, usageCount, onMerge }) {
  const [keepId, setKeepId] = useState(group.suggestedKeepId)
  return (
    <div className="dupe-group">
      <div className="dupe-head">
        <span className="chip accent">{group.items.length} similar ingredients{group.certain ? ' · exact match' : ''}</span>
        <button className="btn sm primary" onClick={() => onMerge(keepId, group.items.map((i) => i.id))}>
          <Icon name="merge" size={14} /> Merge into selected
        </button>
      </div>
      {group.items.map((ing) => (
        <label key={ing.id} className="dupe-item" style={{ cursor: 'pointer' }}>
          <input type="radio" name={'g-' + group.suggestedKeepId} checked={keepId === ing.id} onChange={() => setKeepId(ing.id)} />
          <span className="grow">
            <strong>{ing.name}</strong>
            {ing.brand && <span className="chip" style={{ marginLeft: 8 }}>{ing.brand}</span>}
          </span>
          <span className="muted" style={{ fontSize: 12.5 }}>
            {usageCount(ing.id)} recipe{usageCount(ing.id) === 1 ? '' : 's'} · {(ing.priceHistory || []).length} price pts
            {Object.values(ing.nutritionPer100 || {}).some((v) => v > 0) ? ' · nutrition ✓' : ''}
          </span>
        </label>
      ))}
    </div>
  )
}

function RecipeGroup({ group, onMerge }) {
  const [keepId, setKeepId] = useState(group.suggestedKeepId)
  return (
    <div className="dupe-group">
      <div className="dupe-head">
        <span className="chip accent">{group.items.length} similar recipes</span>
        <button className="btn sm primary" onClick={() => onMerge(keepId, group.items.map((r) => r.id))}>
          <Icon name="merge" size={14} /> Merge into selected
        </button>
      </div>
      {group.items.map((r) => (
        <label key={r.id} className="dupe-item" style={{ cursor: 'pointer' }}>
          <input type="radio" name={'rg-' + group.suggestedKeepId} checked={keepId === r.id} onChange={() => setKeepId(r.id)} />
          <span className="grow">
            <Link to={`/recipes/${r.id}`} style={{ fontWeight: 600 }}>{r.title}</Link>
          </span>
          <span className="muted" style={{ fontSize: 12.5 }}>
            {(r.ingredients || []).length} ingredients · {(r.instructions || []).length} steps
            {r.sourceUrl ? ' · has source' : ''}{r.rating ? ` · ★${r.rating}` : ''}
          </span>
        </label>
      ))}
    </div>
  )
}

export default function Dedupe() {
  const { notify, confirm } = useDialogs()
  const ingredients = useStore((s) => s.ingredients)
  const recipes = useStore((s) => s.recipes)
  const { mergeIngredients, mergeRecipes } = useStore()
  const [scanned, setScanned] = useState(false)

  // Recomputed from live store data, so groups disappear as they're merged.
  const ingGroups = useMemo(() => (scanned ? findDuplicateIngredients(ingredients, recipes) : []), [scanned, ingredients, recipes])
  const recGroups = useMemo(() => (scanned ? findDuplicateRecipes(recipes) : []), [scanned, recipes])

  const usageByIng = useMemo(() => {
    const u = {}
    for (const r of recipes) for (const l of r.ingredients || []) u[l.ingredientId] = (u[l.ingredientId] || 0) + 1
    return u
  }, [recipes])

  const doMergeIngredients = (keepId, ids) => {
    mergeIngredients(keepId, ids.filter((id) => id !== keepId))
    notify('Ingredients merged — recipes, pantry and prices updated.', 'success')
  }
  const doMergeRecipes = (keepId, ids) => {
    mergeRecipes(keepId, ids.filter((id) => id !== keepId))
    notify('Recipes merged — cook log and meal plan updated.', 'success')
  }

  async function mergeAllExact() {
    const certain = ingGroups.filter((g) => g.certain)
    if (!certain.length) return
    const ok = await confirm({
      title: 'Merge all exact matches?',
      message: `${certain.length} ingredient group${certain.length > 1 ? 's' : ''} with identical names will be merged into the entry with the most data.`,
      confirmLabel: 'Merge all',
    })
    if (!ok) return
    for (const g of certain) mergeIngredients(g.suggestedKeepId, g.items.map((i) => i.id).filter((id) => id !== g.suggestedKeepId))
    notify(`Merged ${certain.length} exact-duplicate group${certain.length > 1 ? 's' : ''}.`, 'success')
  }

  const clean = scanned && ingGroups.length === 0 && recGroups.length === 0

  return (
    <>
      <PageHead title="Duplicates" subtitle="Find and merge duplicate ingredients and recipes. Different brands are kept separate.">
        <button className="btn primary" onClick={() => setScanned(true)}>
          <Icon name="search" size={16} /> {scanned ? 'Rescan' : 'Scan for duplicates'}
        </button>
      </PageHead>

      {!scanned && (
        <div className="card">
          <p style={{ margin: 0 }}>Run a scan to check every ingredient and recipe for duplicates and near-duplicates.</p>
          <p className="muted" style={{ fontSize: 14, margin: '10px 0 0' }}>
            New recipes and ingredients are already checked as they're added — an import of “Bread Flour” reuses your
            existing “bread flour” instead of creating a copy, unless it carries a different brand. This scan cleans up
            anything that slipped in earlier. Merging keeps all data: recipe lines, pantry stock, price history and
            nutrition move to the ingredient you keep.
          </p>
        </div>
      )}

      {clean && <Empty icon="check" title="No duplicates found">Your library is clean.</Empty>}

      {ingGroups.length > 0 && (
        <>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
            <span>Ingredients ({ingGroups.length} group{ingGroups.length > 1 ? 's' : ''})</span>
            {ingGroups.some((g) => g.certain) && (
              <button className="btn sm" onClick={mergeAllExact}><Icon name="merge" size={13} /> Merge all exact matches</button>
            )}
          </div>
          {ingGroups.map((g, i) => (
            <IngredientGroup key={g.suggestedKeepId + i} group={g} usageCount={(id) => usageByIng[id] || 0} onMerge={doMergeIngredients} />
          ))}
        </>
      )}

      {recGroups.length > 0 && (
        <>
          <div className="section-title">Recipes ({recGroups.length} group{recGroups.length > 1 ? 's' : ''})</div>
          {recGroups.map((g, i) => (
            <RecipeGroup key={g.suggestedKeepId + i} group={g} onMerge={doMergeRecipes} />
          ))}
        </>
      )}
    </>
  )
}
