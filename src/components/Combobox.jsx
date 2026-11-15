import { useMemo, useRef, useState, useEffect } from 'react'

// Searchable dropdown picker — scales to hundreds of options. options:
// [{ value, label, sublabel? }]. Calls onSelect(value) and closes.
export default function Combobox({ options, onSelect, buttonLabel = 'Add', align = 'right', icon = null, className = 'btn sm' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => { if (open) { setQuery(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 10) } }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? options.filter((o) => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q)) : options
    return list.slice(0, 60)
  }, [options, query])

  const choose = (o) => { onSelect(o.value); setOpen(false) }

  return (
    <div className="combo">
      <button type="button" className={className} onClick={() => setOpen((o) => !o)}>{icon}{buttonLabel}</button>
      {open && (
        <>
          <div className="combo-backdrop" onClick={() => setOpen(false)} />
          <div className={'combo-pop' + (align === 'left' ? ' left' : '')}>
            <input
              ref={inputRef}
              placeholder="Search…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0) }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)) }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
                else if (e.key === 'Enter' && filtered[active]) { e.preventDefault(); choose(filtered[active]) }
                else if (e.key === 'Escape') setOpen(false)
              }}
            />
            <div className="combo-list">
              {filtered.length === 0 && <div className="combo-empty">No matches</div>}
              {filtered.map((o, i) => (
                <button
                  key={o.value}
                  className={'combo-item' + (i === active ? ' active' : '')}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o)}
                >
                  <span>{o.label}</span>
                  {o.sublabel && <small>{o.sublabel}</small>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
