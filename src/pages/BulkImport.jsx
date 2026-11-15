import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useBulkImport, startBulkImport, cancelBulkImport, resetBulkImport, importSelected, isBulkImportRunning } from '../utils/bulkImport.js'
import { num } from '../utils/format.js'
import { PageHead } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { useDialogs } from '../components/Dialogs.jsx'

function StatusIcon({ item }) {
  if (item.status === 'fetching') return <Icon name="clock" size={16} className="spin" style={{ color: 'var(--accent)' }} />
  if (item.status === 'ok') return <Icon name="check" size={16} style={{ color: 'var(--green)' }} />
  if (item.status === 'error') return <Icon name="alert" size={16} style={{ color: 'var(--accent-3)' }} />
  return <Icon name="clock" size={16} style={{ color: 'var(--faint)' }} />
}

export default function BulkImport() {
  const { notify } = useDialogs()
  const { status, indexUrl, error, items, toggleItem, setAllSelected } = useBulkImport()
  const [url, setUrl] = useState('')

  const running = status === 'discovering' || status === 'running'
  const processed = items.filter((i) => i.status === 'ok' || i.status === 'error').length
  const okItems = items.filter((i) => i.status === 'ok')
  const selectable = okItems.filter((i) => !i.imported)
  const selectedCount = selectable.filter((i) => i.selected).length
  const importedCount = items.filter((i) => i.imported).length

  async function handleStart() {
    const target = url.trim()
    if (!target) return
    if (isBulkImportRunning()) {
      notify('A bulk import is already running — one at a time.', 'danger')
      return
    }
    const started = await startBulkImport(target)
    if (!started) notify('A bulk import is already running — one at a time.', 'danger')
  }

  function handleImport() {
    const n = importSelected()
    notify(n ? `Imported ${n} recipe${n > 1 ? 's' : ''} into your library.` : 'Nothing selected to import.', n ? 'success' : 'default')
  }

  return (
    <>
      <PageHead title="Bulk import" subtitle="Point at a recipe index page — every linked recipe is fetched (with nutrition when the site publishes it), then you pick which ones to keep." />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row">
          <input
            className="grow" type="url" placeholder="https://example.com/recipes"
            value={url} onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleStart() }}
            disabled={running}
          />
          {running ? (
            <button className="btn danger" style={{ flex: '0 0 auto' }} onClick={cancelBulkImport}>
              <Icon name="x" size={15} /> Cancel
            </button>
          ) : (
            <button className="btn primary" style={{ flex: '0 0 auto' }} onClick={handleStart} disabled={!url.trim()}>
              <Icon name="download" size={15} /> Find & fetch recipes
            </button>
          )}
        </div>
        <p className="muted" style={{ fontSize: 13, margin: '10px 0 0' }}>
          Runs in the background — you can keep using the app while it works (progress stays visible in the navigation).
          One bulk import runs at a time. Nothing is added to your library until you review and import below.
        </p>
      </div>

      {status === 'discovering' && (
        <div className="card"><span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}><Icon name="search" size={16} className="spin" /> Reading {indexUrl} and looking for recipe links…</span></div>
      )}

      {status === 'error' && (
        <div className="card" style={{ borderColor: 'var(--accent-3)' }}>
          <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon name="alert" size={16} style={{ color: 'var(--accent-3)' }} /> Import failed</strong>
          <p className="muted" style={{ margin: '8px 0 12px' }}>{error}</p>
          <button className="btn sm" onClick={resetBulkImport}>Start over</button>
        </div>
      )}

      {items.length > 0 && (
        <div className="card">
          <div className="toolbar" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <strong>
                {running ? `Importing ${processed} / ${items.length}…` :
                  status === 'cancelled' ? `Cancelled after ${processed} of ${items.length}` :
                    `Fetched ${okItems.length} of ${items.length} recipes`}
              </strong>
              <span className="muted" style={{ display: 'block', fontSize: 12.5, overflowWrap: 'anywhere' }}>{indexUrl}</span>
            </div>
            {!running && (
              <div className="row" style={{ flex: '0 0 auto' }}>
                <button className="btn sm" onClick={() => setAllSelected(true)}>Select all</button>
                <button className="btn sm" onClick={() => setAllSelected(false)}>None</button>
                <button className="btn sm ghost" onClick={resetBulkImport}>Clear</button>
              </div>
            )}
          </div>

          <div className="bar accent" style={{ marginBottom: 14 }}>
            <i style={{ width: `${items.length ? (processed / items.length) * 100 : 0}%` }} />
          </div>

          {items.map((item) => (
            <div key={item.url} className="import-row">
              <span className="status-ic"><StatusIcon item={item} /></span>
              {item.status === 'ok' && (
                <input
                  type="checkbox" checked={item.selected} disabled={item.imported}
                  onChange={() => toggleItem(item.url)} aria-label={`Include ${item.title}`}
                />
              )}
              <span className="t">
                <span className="name">{item.title || item.url.replace(/^https?:\/\//, '')}</span>
                <span className="sub">
                  {item.status === 'ok' && `${item.recipe.ingredientLines.length} ingredients · ${item.recipe.instructions.length} steps` +
                    (item.recipe.nutrition?.calories ? ` · ${num(item.recipe.nutrition.calories)} kcal/serving` : ' · no nutrition data')}
                  {item.status === 'error' && item.error}
                  {item.status === 'fetching' && 'Fetching…'}
                  {item.status === 'pending' && 'Queued'}
                </span>
              </span>
              {item.imported && <span className="chip tag">imported ✓</span>}
              {!item.imported && item.duplicate && <span className="chip accent">already in library</span>}
            </div>
          ))}

          {selectable.length > 0 && (
            <div className="row" style={{ marginTop: 16 }}>
              <button className="btn primary" style={{ flex: '0 0 auto' }} onClick={handleImport} disabled={selectedCount === 0}>
                <Icon name="check" size={15} /> Import {selectedCount} selected recipe{selectedCount === 1 ? '' : 's'}
              </button>
            </div>
          )}
          {importedCount > 0 && (
            <p className="muted" style={{ fontSize: 13.5, marginTop: 12 }}>
              {importedCount} recipe{importedCount > 1 ? 's' : ''} added — <Link to="/recipes" style={{ color: 'var(--accent)', fontWeight: 600 }}>view your recipes</Link>.
              Ingredients were matched against your existing library to avoid duplicates.
            </p>
          )}
        </div>
      )}
    </>
  )
}
