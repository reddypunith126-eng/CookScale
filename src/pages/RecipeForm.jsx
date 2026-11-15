import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store.js'
import { unitCategory, UNITS_BY_CATEGORY } from '../utils/units.js'
import { parseFraction } from '../utils/format.js'
import { resolvePerServing } from '../utils/nutrition.js'
import { parseRecipeText, fetchRecipeFromUrl, parseIngredientLine } from '../utils/recipeImport.js'
import { matchIngredient } from '../utils/receipt.js'
import { PageHead, BackLink, Stars, TAG_LIBRARY } from '../components/ui.jsx'
import NutritionPanel from '../components/NutritionPanel.jsx'
import Icon from '../components/Icon.jsx'
import { useDialogs } from '../components/Dialogs.jsx'

// Quantity field that accepts typed fractions ("1 1/2", "½", "1.5").
function FractionInput({ value, onChange, style }) {
  const [text, setText] = useState(value == null ? '' : String(value))
  return (
    <input
      type="text" inputMode="text" style={style} value={text}
      onChange={(e) => { const t = e.target.value; setText(t); const n = parseFraction(t); if (n != null) onChange(n) }}
      onBlur={() => { if (parseFraction(text) == null) setText(value == null ? '' : String(value)) }}
    />
  )
}

const ALL_UNITS = [...UNITS_BY_CATEGORY.mass, ...UNITS_BY_CATEGORY.volume, ...UNITS_BY_CATEGORY.count]

function baseUnitForUnit(u) {
  const cat = unitCategory(u)
  return cat === 'mass' ? 'g' : cat === 'volume' ? 'ml' : 'each'
}

export default function RecipeForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const existing = useStore((s) => s.recipes.find((r) => r.id === id))
  const ingredients = useStore((s) => s.ingredients)
  const { addRecipe, updateRecipe, addIngredient } = useStore()
  const { prompt } = useDialogs()

  const [form, setForm] = useState(
    existing || {
      title: '', servings: 4, prepTime: 0, cookTime: 0, tags: [], image: '', sourceUrl: '',
      rating: 0, ingredients: [], instructions: [],
    },
  )
  const [instructionsText, setInstructionsText] = useState((existing?.instructions || []).join('\n'))
  const [importUrl, setImportUrl] = useState('')
  const [importText, setImportText] = useState('')
  const [importStatus, setImportStatus] = useState('')
  const [customTag, setCustomTag] = useState('')

  const ingredientsById = useMemo(() => Object.fromEntries(ingredients.map((i) => [i.id, i])), [ingredients])
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const toggleTag = (t) =>
    set({ tags: form.tags.includes(t) ? form.tags.filter((x) => x !== t) : [...form.tags, t] })

  // Always reuse an existing ingredient when we can — exact match first, then fuzzy.
  function findOrCreateIngredient(name, unit) {
    const exact = ingredients.find((i) => i.name.toLowerCase() === name.toLowerCase().trim())
    if (exact) return exact.id
    const fuzzy = matchIngredient(name, ingredients)
    if (fuzzy) return fuzzy.id
    return addIngredient({ name: name.trim(), baseUnit: baseUnitForUnit(unit) })
  }

  function applyImported(data) {
    if (!data) {
      setImportStatus('Could not find recipe data. Try pasting the page HTML or the recipe JSON instead.')
      return
    }
    const newLines = data.ingredientLines.map((raw) => {
      const parsed = parseIngredientLine(raw)
      const ingredientId = findOrCreateIngredient(parsed.name, parsed.unit)
      return { ingredientId, quantity: parsed.quantity, unit: parsed.unit, note: '' }
    })
    setForm((f) => ({
      ...f,
      title: data.title || f.title,
      servings: data.servings || f.servings,
      image: data.image || f.image,
      sourceUrl: data.sourceUrl || f.sourceUrl,
      nutrition: data.nutrition || f.nutrition || null,
      tags: [...new Set([...f.tags, ...data.tags.map((t) => t.toLowerCase())])].slice(0, 12),
      ingredients: [...f.ingredients, ...newLines],
    }))
    setInstructionsText((prev) => [prev, ...data.instructions].filter(Boolean).join('\n'))
    const nutBit = data.nutrition ? ` · nutrition ${Math.round(data.nutrition.calories || 0)} kcal/serving` : ''
    setImportStatus(`Imported “${data.title}” — ${newLines.length} ingredients${nutBit}. Review and adjust below.`)
  }

  async function handleUrlImport() {
    if (!importUrl.trim()) return
    setImportStatus('Fetching recipe…')
    try {
      const data = await fetchRecipeFromUrl(importUrl.trim())
      applyImported(data)
    } catch (e) {
      setImportStatus('⚠ ' + e.message + ' You can paste the page source or recipe JSON below instead.')
    }
  }

  const addLine = () => set({ ingredients: [...form.ingredients, { ingredientId: ingredients[0]?.id || '', quantity: 1, unit: 'g', note: '' }] })
  const updateLine = (i, patch) =>
    set({ ingredients: form.ingredients.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) })
  const removeLine = (i) => set({ ingredients: form.ingredients.filter((_, idx) => idx !== i) })

  function save() {
    const payload = {
      ...form,
      servings: Number(form.servings) || 1,
      prepTime: Number(form.prepTime) || 0,
      cookTime: Number(form.cookTime) || 0,
      instructions: instructionsText.split('\n').map((s) => s.trim()).filter(Boolean),
    }
    if (existing) {
      updateRecipe(id, payload)
      navigate(`/recipes/${id}`)
    } else {
      const newId = addRecipe(payload)
      navigate(`/recipes/${newId}`)
    }
  }

  return (
    <>
      <BackLink to="/recipes">All recipes</BackLink>
      <PageHead title={existing ? 'Edit recipe' : 'New recipe'} />

      {!existing && (
        <div className="card" style={{ marginBottom: 18 }}>
          <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon name="download" size={16} /> Import a recipe</strong>
          <p className="muted" style={{ fontSize: 13, margin: '6px 0 12px' }}>
            Paste a recipe URL (reads open schema.org recipe data), or paste the recipe JSON-LD / page HTML directly.
          </p>
          <div className="row">
            <input className="grow" placeholder="https://example.com/recipe" value={importUrl} onChange={(e) => setImportUrl(e.target.value)} />
            <button className="btn" style={{ flex: '0 0 auto' }} onClick={handleUrlImport}>Fetch from URL</button>
          </div>
          <textarea rows={3} style={{ marginTop: 10 }} placeholder="…or paste recipe JSON / page source here" value={importText} onChange={(e) => setImportText(e.target.value)} />
          <div className="row" style={{ marginTop: 8, alignItems: 'center' }}>
            <button className="btn" style={{ flex: '0 0 auto' }} onClick={() => applyImported(parseRecipeText(importText))}>Parse pasted text</button>
            {importStatus && <span className="muted" style={{ fontSize: 13 }}>{importStatus}</span>}
          </div>
        </div>
      )}

      <div className="card">
        <div className="row">
          <label className="field" style={{ flex: 3 }}><span>Title</span>
            <input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Recipe name" />
          </label>
          <label className="field"><span>Servings</span>
            <input type="number" min="1" value={form.servings} onChange={(e) => set({ servings: e.target.value })} />
          </label>
        </div>
        <div className="row">
          <label className="field"><span>Prep (min)</span><input type="number" min="0" value={form.prepTime} onChange={(e) => set({ prepTime: e.target.value })} /></label>
          <label className="field"><span>Cook (min)</span><input type="number" min="0" value={form.cookTime} onChange={(e) => set({ cookTime: e.target.value })} /></label>
          <label className="field"><span>Image URL</span><input value={form.image} onChange={(e) => set({ image: e.target.value })} placeholder="optional — auto-filled on import" /></label>
        </div>
        {form.image && <img src={form.image} className="img-preview" alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} />}
        <label className="field" style={{ marginTop: 12 }}><span>Rating</span><div><Stars value={form.rating} onChange={(v) => set({ rating: v })} /></div></label>

        <div className="field">
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>Tags / recipe types (multiple)</span>
          <div className="chips">
            {[...new Set([...TAG_LIBRARY, ...form.tags])].map((t) => (
              <span key={t} className={'chip tag' + (form.tags.includes(t) ? ' active' : '')} onClick={() => toggleTag(t)}>{t}</span>
            ))}
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <input className="grow" placeholder="Add custom tag…" value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && customTag.trim()) { toggleTag(customTag.trim().toLowerCase()); setCustomTag('') } }} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="toolbar" style={{ justifyContent: 'space-between' }}>
          <strong>Ingredients</strong>
          <button className="btn sm" onClick={addLine}>＋ Add ingredient</button>
        </div>
        {form.ingredients.length === 0 && <p className="muted">No ingredients yet.</p>}
        {form.ingredients.map((line, i) => {
          const cat = unitCategory(line.unit)
          const unitOpts = cat ? UNITS_BY_CATEGORY[cat] : ALL_UNITS
          return (
            <div key={i} className="row" style={{ marginBottom: 8, alignItems: 'center' }}>
              <FractionInput style={{ flex: '0 0 84px' }} value={line.quantity} onChange={(q) => updateLine(i, { quantity: q })} />
              <select style={{ flex: '0 0 90px' }} value={line.unit} onChange={(e) => updateLine(i, { unit: e.target.value })}>
                {ALL_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <select style={{ flex: 2 }} value={line.ingredientId} onChange={(e) => updateLine(i, { ingredientId: e.target.value })}>
                <option value="">— select ingredient —</option>
                {ingredients.map((ing) => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
              </select>
              <input style={{ flex: 1 }} placeholder="note" value={line.note} onChange={(e) => updateLine(i, { note: e.target.value })} />
              <button className="btn ghost sm" style={{ flex: '0 0 auto' }} onClick={() => removeLine(i)}>✕</button>
            </div>
          )
        })}
        <button className="btn sm" style={{ marginTop: 6 }} onClick={async () => {
          const name = await prompt({ title: 'New ingredient', label: 'Ingredient name', placeholder: 'e.g. Smoked Paprika' })
          if (name && name.trim()) { const nid = addIngredient({ name: name.trim() }); set({ ingredients: [...form.ingredients, { ingredientId: nid, quantity: 1, unit: 'g', note: '' }] }) }
        }}><Icon name="plus" size={14} /> Create new ingredient</button>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <strong>Nutrition label <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>· updates live as you edit</span></strong>
        <div style={{ marginTop: 12 }}>
          <NutritionPanel
            nutrition={resolvePerServing({ ingredients: form.ingredients, servings: Number(form.servings) || 1, nutrition: form.nutrition }, ingredientsById)}
            label="Per serving"
          />
        </div>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>Values come from each ingredient's nutrition — fill any blanks via an ingredient's USDA lookup.</p>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <strong>Instructions</strong>
        <p className="muted" style={{ fontSize: 13, margin: '4px 0 8px' }}>One step per line.</p>
        <textarea rows={8} value={instructionsText} onChange={(e) => setInstructionsText(e.target.value)} />
      </div>

      <div className="row" style={{ marginTop: 18, flex: '0 0 auto' }}>
        <button className="btn primary" style={{ flex: '0 0 auto' }} onClick={save}>{existing ? 'Save changes' : 'Create recipe'}</button>
        <button className="btn" style={{ flex: '0 0 auto' }} onClick={() => navigate(-1)}>Cancel</button>
      </div>
    </>
  )
}
