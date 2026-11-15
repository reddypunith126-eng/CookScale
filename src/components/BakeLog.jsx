import { useMemo, useState } from 'react'
import { ScatterChart, Scatter, LineChart, Line, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useStore } from '../store.js'
import { fmtDate, todayISO } from '../utils/format.js'
import { useChart, tooltipStyle } from '../theme.js'
import { Modal, Empty } from './ui.jsx'
import Icon from './Icon.jsx'

function Pips({ value }) {
  return <span className="rating-pips">{[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= value ? 'on' : ''} />)}</span>
}

function RatingField({ label, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="rating-pips" style={{ gap: 6, paddingTop: 4 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <i key={i} onClick={() => onChange(i)} className={i <= value ? 'on' : ''} style={{ width: 20, height: 20, cursor: 'pointer' }} title={String(i)} />
        ))}
      </div>
    </label>
  )
}

export default function BakeLog() {
  const bakes = useStore((s) => s.bakes)
  const recipes = useStore((s) => s.recipes)
  const { addBake, deleteBake } = useStore()
  const c = useChart()
  const TT = tooltipStyle(c)
  const [open, setOpen] = useState(false)

  const breadRecipes = recipes.filter((r) => (r.tags || []).includes('bread'))
  const sorted = useMemo(() => [...bakes].sort((a, b) => b.date.localeCompare(a.date)), [bakes])
  const byFolds = useMemo(() => [...bakes].map((b) => ({ ...b, x: b.folds })), [bakes])
  const overTime = useMemo(() => [...bakes].sort((a, b) => a.date.localeCompare(b.date)).map((b) => ({ date: fmtDate(b.date, 'MMM d'), risePct: b.risePct, crumb: b.crumb, overall: b.overall })), [bakes])

  const scatterTip = (val, name, p) => [val, name]

  return (
    <>
      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>Log each bake's variables and results to see what actually moves rise &amp; crumb.</p>
        <button className="btn primary" onClick={() => setOpen(true)}><Icon name="plus" size={16} /> Log a bake</button>
      </div>

      {bakes.length === 0 ? (
        <Empty icon="jar" title="No bakes logged yet">Record a bake to start comparing techniques.</Empty>
      ) : (
        <>
          <div className="grid cols-2" style={{ marginBottom: 18 }}>
            <div className="card">
              <strong>Folds → Crumb openness</strong>
              <p className="muted" style={{ fontSize: 12.5, margin: '4px 0 0' }}>Each dot is a bake. More folds generally = more open crumb.</p>
              <div style={{ height: 230, marginTop: 10 }}>
                <ResponsiveContainer>
                  <ScatterChart margin={{ left: -16, right: 10, top: 8, bottom: 4 }}>
                    <CartesianGrid stroke={c.grid} />
                    <XAxis type="number" dataKey="x" name="Folds" domain={[0, 6]} tickCount={7} fontSize={12} stroke={c.axis} label={{ value: 'folds', position: 'insideBottom', offset: -2, fill: c.axis, fontSize: 11 }} />
                    <YAxis type="number" dataKey="crumb" name="Crumb" domain={[0, 5]} tickCount={6} fontSize={12} stroke={c.axis} />
                    <ZAxis range={[90, 90]} />
                    <Tooltip {...TT} formatter={scatterTip} labelFormatter={() => ''} />
                    <Scatter data={byFolds} fill={c.line} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <strong>Folds → Rise</strong>
              <p className="muted" style={{ fontSize: 12.5, margin: '4px 0 0' }}>Dough rise (%) during bulk vs. number of stretch &amp; folds.</p>
              <div style={{ height: 230, marginTop: 10 }}>
                <ResponsiveContainer>
                  <ScatterChart margin={{ left: -8, right: 10, top: 8, bottom: 4 }}>
                    <CartesianGrid stroke={c.grid} />
                    <XAxis type="number" dataKey="x" name="Folds" domain={[0, 6]} tickCount={7} fontSize={12} stroke={c.axis} label={{ value: 'folds', position: 'insideBottom', offset: -2, fill: c.axis, fontSize: 11 }} />
                    <YAxis type="number" dataKey="risePct" name="Rise %" domain={[0, 100]} fontSize={12} stroke={c.axis} />
                    <ZAxis range={[90, 90]} />
                    <Tooltip {...TT} formatter={scatterTip} labelFormatter={() => ''} />
                    <Scatter data={byFolds} fill={c.cooks} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 18 }}>
            <strong>Progress over time</strong>
            <div style={{ height: 220, marginTop: 12 }}>
              <ResponsiveContainer>
                <LineChart data={overTime} margin={{ left: -14, right: 10, top: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                  <XAxis dataKey="date" fontSize={12} stroke={c.axis} />
                  <YAxis yAxisId="l" domain={[0, 100]} fontSize={12} stroke={c.axis} />
                  <YAxis yAxisId="r" orientation="right" domain={[0, 5]} fontSize={12} stroke={c.axis} />
                  <Tooltip {...TT} />
                  <Line yAxisId="l" type="monotone" dataKey="risePct" name="Rise %" stroke={c.cooks} strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line yAxisId="r" type="monotone" dataKey="crumb" name="Crumb" stroke={c.line} strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line yAxisId="r" type="monotone" dataKey="overall" name="Overall" stroke={c.line2} strokeWidth={2} strokeDasharray="4 3" dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <table>
              <thead>
                <tr>
                  <th></th><th>Bake</th><th>Hydr.</th><th>Folds</th><th>Bulk</th><th>Proof</th>
                  <th>Rise</th><th>Spring</th><th>Crumb</th><th>Crust</th><th>Overall</th><th></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((b) => (
                  <tr key={b.id}>
                    <td style={{ width: 56 }}>
                      {b.photo ? <img src={b.photo} className="bake-photo" alt="" /> : <span className="bake-photo ph"><Icon name="bowl" size={20} /></span>}
                    </td>
                    <td style={{ fontWeight: 600 }}>{b.label || 'Bake'}<div className="muted" style={{ fontSize: 12, fontWeight: 400 }}>{fmtDate(b.date)}{b.notes ? ` · ${b.notes.slice(0, 48)}${b.notes.length > 48 ? '…' : ''}` : ''}</div></td>
                    <td className="muted">{b.hydration}%</td>
                    <td style={{ fontWeight: 600 }}>{b.folds}</td>
                    <td className="muted">{b.bulkHours}h @ {b.bulkTempF}°</td>
                    <td className="muted">{b.proofType} {b.proofHours}h</td>
                    <td style={{ fontWeight: 600 }}>{b.risePct}%</td>
                    <td><Pips value={b.ovenSpring} /></td>
                    <td><Pips value={b.crumb} /></td>
                    <td><Pips value={b.crust} /></td>
                    <td><Pips value={b.overall} /></td>
                    <td style={{ textAlign: 'right' }}><button className="btn ghost sm" onClick={() => deleteBake(b.id)}><Icon name="trash" size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {open && <BakeForm breadRecipes={breadRecipes} onClose={() => setOpen(false)} onSave={(data) => { addBake(data); setOpen(false) }} />}
    </>
  )
}

function BakeForm({ breadRecipes, onClose, onSave }) {
  const [f, setF] = useState({
    date: todayISO(), label: '', recipeId: breadRecipes[0]?.id || '', hydration: 75, folds: 3,
    bulkHours: 4.5, bulkTempF: 75, proofType: 'fridge', proofHours: 12, bakeTempF: 450,
    risePct: 60, ovenSpring: 3, crumb: 3, crust: 3, overall: 3, notes: '', photo: '',
  })
  const set = (patch) => setF((s) => ({ ...s, ...patch }))
  const onPhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => set({ photo: reader.result })
    reader.readAsDataURL(file)
  }

  return (
    <Modal title="Log a bake" onClose={onClose}>
      <div className="row">
        <label className="field" style={{ flex: 2 }}><span>Label</span><input autoFocus value={f.label} onChange={(e) => set({ label: e.target.value })} placeholder="e.g. Four folds, higher hydration" /></label>
        <label className="field"><span>Date</span><input type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} /></label>
      </div>
      {breadRecipes.length > 0 && (
        <label className="field"><span>Recipe</span>
          <select value={f.recipeId} onChange={(e) => set({ recipeId: e.target.value })}>
            <option value="">— none —</option>
            {breadRecipes.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
        </label>
      )}

      <div className="section-title" style={{ marginTop: 4 }}>Variables</div>
      <div className="row">
        <label className="field"><span>Hydration (%)</span><input type="number" value={f.hydration} onChange={(e) => set({ hydration: Number(e.target.value) })} /></label>
        <label className="field"><span>Stretch &amp; folds</span><input type="number" value={f.folds} onChange={(e) => set({ folds: Number(e.target.value) })} /></label>
        <label className="field"><span>Bake temp (°F)</span><input type="number" value={f.bakeTempF} onChange={(e) => set({ bakeTempF: Number(e.target.value) })} /></label>
      </div>
      <div className="row">
        <label className="field"><span>Bulk (hours)</span><input type="number" step="any" value={f.bulkHours} onChange={(e) => set({ bulkHours: Number(e.target.value) })} /></label>
        <label className="field"><span>Bulk temp (°F)</span><input type="number" value={f.bulkTempF} onChange={(e) => set({ bulkTempF: Number(e.target.value) })} /></label>
        <label className="field"><span>Proof</span>
          <select value={f.proofType} onChange={(e) => set({ proofType: e.target.value })}><option value="fridge">fridge</option><option value="counter">counter</option></select>
        </label>
        <label className="field"><span>Proof (hours)</span><input type="number" step="any" value={f.proofHours} onChange={(e) => set({ proofHours: Number(e.target.value) })} /></label>
      </div>

      <div className="section-title">Results</div>
      <label className="field"><span>Bulk rise (%)</span><input type="number" value={f.risePct} onChange={(e) => set({ risePct: Number(e.target.value) })} /></label>
      <div className="row">
        <RatingField label="Oven spring" value={f.ovenSpring} onChange={(v) => set({ ovenSpring: v })} />
        <RatingField label="Crumb openness" value={f.crumb} onChange={(v) => set({ crumb: v })} />
        <RatingField label="Crust" value={f.crust} onChange={(v) => set({ crust: v })} />
        <RatingField label="Overall" value={f.overall} onChange={(v) => set({ overall: v })} />
      </div>
      <label className="field"><span>Notes</span><textarea rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="crumb structure, handling, taste…" /></label>
      <label className="field"><span>Photo of the crumb (optional)</span><input type="file" accept="image/*" onChange={onPhoto} /></label>
      {f.photo && <img src={f.photo} className="img-preview" alt="" />}

      <button className="btn primary" style={{ marginTop: 12 }} onClick={() => onSave(f)}>Save bake</button>
    </Modal>
  )
}
