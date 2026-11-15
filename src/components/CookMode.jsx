import { useEffect, useState } from 'react'
import { useWakeLock } from '../utils/wakeLock.js'
import { unitLabel, unitCategory, formatQuantity } from '../utils/units.js'
import { gramsForLine } from '../utils/density.js'
import { num, todayISO } from '../utils/format.js'
import Icon from './Icon.jsx'

export default function CookMode({ recipe, ingredientsById, onClose, onLogged }) {
  const steps = recipe.instructions?.length ? recipe.instructions : ['No instructions for this recipe.']
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(() => new Set())
  const [scale, setScale] = useState(1)
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const wake = useWakeLock()

  useEffect(() => { wake.request() ; return () => { wake.release() } }, []) // eslint-disable-line
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [running])

  const toggle = (i) => setDone((d) => { const n = new Set(d); n.has(i) ? n.delete(i) : n.add(i); return n })
  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  const last = step >= steps.length - 1

  return (
    <div className="cookmode">
      <div className="cookmode-bar">
        <div>
          <div className="cookmode-title">{recipe.title}</div>
          <div className="cookmode-sub">
            <span className={'wake-dot' + (wake.active ? ' on' : '')} />
            {wake.active ? 'Screen stays awake' : wake.supported ? 'Wake lock inactive' : 'Wake lock unsupported here'}
          </div>
        </div>
        <div className="cookmode-actions">
          <select value={scale} onChange={(e) => setScale(Number(e.target.value))}>
            {[0.5, 1, 1.5, 2, 3, 4].map((m) => <option key={m} value={m}>{m}× · {Math.round(recipe.servings * m)} serv</option>)}
          </select>
          <button className="btn" onClick={onClose}><Icon name="x" size={15} /> Exit</button>
        </div>
      </div>

      <div className="cookmode-body">
        <aside className="cookmode-ingredients">
          <h3>Ingredients</h3>
          {recipe.ingredients.map((line, i) => {
            const ing = ingredientsById[line.ingredientId]
            const checked = done.has('i' + i)
            const grams = unitCategory(line.unit) === 'volume' ? gramsForLine(line, ing) : null
            return (
              <label key={i} className={'cook-ing' + (checked ? ' checked' : '')} onClick={() => toggle('i' + i)}>
                <input type="checkbox" readOnly checked={checked} />
                <span><b>{formatQuantity(line.quantity * scale, line.unit)} {unitLabel(line.unit)}</b>{grams != null ? ` (${num(grams * scale)} g)` : ''} {ing?.name || 'unknown'}{line.note ? ` · ${line.note}` : ''}</span>
              </label>
            )
          })}
          <div className="cook-timer">
            <div className="cook-timer-time">{mmss}</div>
            <div className="row" style={{ flex: '0 0 auto' }}>
              <button className="btn sm" onClick={() => setRunning((r) => !r)}>{running ? 'Pause' : 'Start'}</button>
              <button className="btn sm" onClick={() => { setSeconds(0); setRunning(false) }}>Reset</button>
            </div>
          </div>
        </aside>

        <main className="cookmode-step">
          <div className="cook-stepno">Step {step + 1} <span>/ {steps.length}</span></div>
          <p className="cook-steptext">{steps[step]}</p>
          <div className="cook-progress"><i style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
          <div className="cookmode-nav">
            <button className="btn lg" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>← Back</button>
            {last ? (
              <button className="btn primary lg" onClick={() => onLogged(Math.round(recipe.servings * scale), todayISO())}><Icon name="check" size={17} /> Done — log cook</button>
            ) : (
              <button className="btn primary lg" onClick={() => setStep((s) => s + 1)}>Next →</button>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
