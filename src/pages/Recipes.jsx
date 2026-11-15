import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore, recipeCost } from '../store.js'
import { resolvePerServing } from '../utils/nutrition.js'
import { money, num } from '../utils/format.js'
import { PageHead, Stars, Empty } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { recipeThumb } from '../utils/recipeThumb.js'

export default function Recipes() {
  const recipes = useStore((s) => s.recipes)
  const ingredients = useStore((s) => s.ingredients)
  const navigate = useNavigate()
  const ingredientsById = useMemo(() => Object.fromEntries(ingredients.map((i) => [i.id, i])), [ingredients])

  const [query, setQuery] = useState('')
  const [activeTags, setActiveTags] = useState([])
  const [sort, setSort] = useState('recent')
  const [favOnly, setFavOnly] = useState(false)
  const [view, setView] = useState('list')

  const allTags = useMemo(() => [...new Set(recipes.flatMap((r) => r.tags || []))].sort(), [recipes])

  const toggleTag = (t) =>
    setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))

  const enriched = useMemo(() => {
    return recipes.map((r) => ({
      r,
      cost: recipeCost(r, ingredientsById),
      nutr: resolvePerServing(r, ingredientsById),
    }))
  }, [recipes, ingredientsById])

  const filtered = useMemo(() => {
    let list = enriched.filter(({ r }) => {
      if (favOnly && !r.favorite) return false
      if (query && !r.title.toLowerCase().includes(query.toLowerCase())) return false
      if (activeTags.length && !activeTags.every((t) => (r.tags || []).includes(t))) return false
      return true
    })
    const sorters = {
      recent: (a, b) => (b.r.createdAt || '').localeCompare(a.r.createdAt || ''),
      'price-asc': (a, b) => a.cost.perServing - b.cost.perServing,
      'price-desc': (a, b) => b.cost.perServing - a.cost.perServing,
      name: (a, b) => a.r.title.localeCompare(b.r.title),
      rating: (a, b) => (b.r.rating || 0) - (a.r.rating || 0),
      calories: (a, b) => a.nutr.calories - b.nutr.calories,
    }
    return [...list].sort(sorters[sort])
  }, [enriched, query, activeTags, sort, favOnly])

  return (
    <>
      <PageHead title="Recipes" subtitle={`${recipes.length} recipes in your collection`}>
        <Link to="/recipes/new" className="btn primary"><Icon name="plus" size={16} /> New recipe</Link>
      </PageHead>

      <div className="toolbar">
        <input
          className="grow"
          placeholder="Search recipes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 'auto' }}>
          <option value="recent">Newest</option>
          <option value="price-asc">Price / serving ↑</option>
          <option value="price-desc">Price / serving ↓</option>
          <option value="calories">Calories / serving ↑</option>
          <option value="rating">Rating</option>
          <option value="name">Name A–Z</option>
        </select>
        <button className={'btn' + (favOnly ? ' primary' : '')} onClick={() => setFavOnly((v) => !v)}>
          <Icon name="heart" size={15} fill={favOnly} /> Favorites
        </button>
        <div className="tabs" style={{ margin: 0, padding: 3 }}>
          <button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')} title="Grid view"><span className="ic"><Icon name="grid" size={15} /></span></button>
          <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} title="List view"><span className="ic"><Icon name="list" size={15} /></span></button>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="chips" style={{ marginBottom: 18 }}>
          {allTags.map((t) => (
            <span
              key={t}
              className={'chip tag' + (activeTags.includes(t) ? ' active' : '')}
              onClick={() => toggleTag(t)}
            >
              {t}
            </span>
          ))}
          {activeTags.length > 0 && (
            <span className="chip" style={{ cursor: 'pointer' }} onClick={() => setActiveTags([])}>clear ✕</span>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <Empty icon="book" title="No recipes match your filters">
          <Link to="/recipes/new" className="btn primary" style={{ marginTop: 6 }}>Add your first recipe</Link>
        </Empty>
      ) : view === 'list' ? (
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
              {filtered.map(({ r, cost, nutr }) => {
                const thumb = recipeThumb(r)
                const totalTime = (r.prepTime || 0) + (r.cookTime || 0)
                return (
                  <tr key={r.id} className="clickable" onClick={() => navigate(`/recipes/${r.id}`)}>
                    <td>
                      <div className="rx-name">
                        <span className="rx-swatch" style={{ background: thumb.gradient }} aria-hidden="true">{thumb.emoji}</span>
                        <span className="rx-title">
                          <span className="rx-t">{r.favorite && <i className="fav-mark" title="Favorite" />}{r.title}</span>
                          <span className="rx-tags">
                            {(r.tags || []).slice(0, 4).join(' · ') || 'untagged'}
                            {r.rating > 0 && <span className="rx-stars"><Stars value={r.rating} /></span>}
                          </span>
                          <span className="rx-specs">
                            <span>{r.servings} serv</span>
                            {totalTime > 0 && <span>{totalTime} min</span>}
                            <span>{num(nutr.calories)} kcal</span>
                            {cost.knownCount > 0 && <span className="price-tag">{money(cost.perServing)}</span>}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="num">{r.servings}</td>
                    <td className="num">{totalTime ? `${totalTime} min` : '—'}</td>
                    <td className="num">{num(nutr.calories)}</td>
                    <td className="num price-tag">{cost.knownCount ? money(cost.perServing) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid cols-3">
          {filtered.map(({ r, cost, nutr }) => {
            const thumb = recipeThumb(r)
            const totalTime = (r.prepTime || 0) + (r.cookTime || 0)
            return (
              <div key={r.id} className="card recipe-card" onClick={() => navigate(`/recipes/${r.id}`)}>
                <div className="thumb" style={r.image ? undefined : { background: thumb.gradient }}>
                  {r.image
                    ? <img src={r.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span className="thumb-emoji" aria-hidden="true">{thumb.emoji}</span>}
                  {r.favorite && <span className="fav-badge" title="Favorite"><Icon name="heart" size={13} fill /></span>}
                  {cost.knownCount > 0 && <span className="thumb-price">{money(cost.perServing)}<small>/serv</small></span>}
                </div>
                <div className="body">
                  <h3>{r.title}</h3>
                  {r.rating > 0 && <div style={{ marginBottom: 8 }}><Stars value={r.rating} /></div>}
                  <div className="chips">
                    {(r.tags || []).slice(0, 3).map((t) => (
                      <span key={t} className="chip tag">{t}</span>
                    ))}
                  </div>
                  <div className="card-meta">
                    {totalTime > 0 && <span><Icon name="clock" size={13.5} /> {totalTime} min</span>}
                    <span><Icon name="bowl" size={13.5} /> {r.servings} serv</span>
                    <span><Icon name="flame" size={13.5} /> {num(nutr.calories)} kcal</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
