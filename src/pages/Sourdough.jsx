import { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { useStore } from '../store.js'
import { num, fmtDate, today } from '../utils/format.js'
import { fetchCurrentWeather, describeWeather } from '../utils/weather.js'
import { PageHead, Empty } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import BakeLog from '../components/BakeLog.jsx'
import { useChart, tooltipStyle } from '../theme.js'

function hydration(f) {
  return f.flour ? (f.water / f.flour) * 100 : 0
}
// Reduce starter:flour:water to a simple ratio for display.
function feedRatio(f) {
  const g = (a, b) => (b === 0 ? a : g(b, a % b))
  const d = [f.starter, f.flour, f.water].filter(Boolean).reduce((x, y) => g(x, y), f.starter || 1)
  return `${num(f.starter / d, 0)} : ${num(f.flour / d, 0)} : ${num(f.water / d, 0)}`
}

function currentStreak(feedings) {
  const days = [...new Set(feedings.map((f) => f.date.slice(0, 10)))].sort().reverse()
  if (!days.length) return 0
  let streak = 0
  let cursor = today()
  for (const d of days) {
    const diff = differenceInCalendarDays(cursor, parseISO(d))
    if (diff <= 1) { streak++; cursor = parseISO(d) }
    else break
  }
  return streak
}

export default function Sourdough() {
  const feedings = useStore((s) => s.starterFeedings)
  const location = useStore((s) => s.settings.location)
  const { addFeeding, deleteFeeding, setSetting } = useStore()
  const [form, setForm] = useState({
    date: '2026-06-16T08:00', flour: 50, water: 50, starter: 50, flourType: 'bread flour', tempF: 72, note: '', discardUsed: false, weather: null,
  })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const [weatherStatus, setWeatherStatus] = useState('')
  const [tab, setTab] = useState('starter')
  const c = useChart()
  const TT = tooltipStyle(c)

  async function fetchWeatherNow() {
    setWeatherStatus('Getting weather…')
    try {
      const w = await fetchCurrentWeather(location)
      if (w.lat != null && !location) setSetting('location', { lat: w.lat, lon: w.lon })
      set({ weather: { tempF: w.tempF, humidity: w.humidity, code: w.code, description: w.description, icon: w.icon } })
      setWeatherStatus('')
    } catch (e) {
      setWeatherStatus('⚠ ' + e.message)
    }
  }
  const setWeatherField = (patch) => set({ weather: { code: 0, icon: '🌡️', description: '', ...(form.weather || {}), ...patch } })

  const sorted = useMemo(() => [...feedings].sort((a, b) => b.date.localeCompare(a.date)), [feedings])
  const chartData = useMemo(
    () => [...feedings].sort((a, b) => a.date.localeCompare(b.date)).map((f) => ({
      date: fmtDate(f.date, 'MMM d'), hydration: +hydration(f).toFixed(0), temp: f.tempF,
    })),
    [feedings],
  )
  const avgHyd = feedings.length ? feedings.reduce((a, f) => a + hydration(f), 0) / feedings.length : 0
  const last = sorted[0]
  const daysSince = last ? differenceInCalendarDays(today(), parseISO(last.date.slice(0, 10))) : null

  return (
    <>
      <PageHead title="Sourdough" subtitle="Starter feedings and bread bake experiments" />

      <div className="tabs">
        <button className={tab === 'starter' ? 'on' : ''} onClick={() => setTab('starter')}><span className="ic"><Icon name="jar" size={15} /></span> Starter log</button>
        <button className={tab === 'bakes' ? 'on' : ''} onClick={() => setTab('bakes')}><span className="ic"><Icon name="bowl" size={15} /></span> Bread bakes</button>
      </div>

      {tab === 'bakes' ? <BakeLog /> : (<>
      <div className="grid cols-4" style={{ marginBottom: 20 }}>
        <div className="card stat"><span className="label">Feeding streak</span><span className="value">{currentStreak(feedings)}<span style={{ fontSize: 15 }}> days</span></span><span className="sub">{feedings.length} feedings logged</span></div>
        <div className="card stat"><span className="label">Last fed</span><span className="value">{daysSince === 0 ? 'Today' : daysSince === 1 ? 'Yesterday' : daysSince != null ? daysSince + 'd ago' : '—'}</span><span className="sub">{last ? fmtDate(last.date) : ''}</span></div>
        <div className="card stat"><span className="label">Avg hydration</span><span className="value">{num(avgHyd, 0)}%</span><span className="sub">water ÷ flour</span></div>
        <div className="card stat"><span className="label">Reminder</span><span className="value" style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}><Icon name={daysSince >= 1 ? 'bell' : 'check'} size={18} style={{ color: daysSince >= 1 ? 'var(--accent)' : 'var(--green)' }} />{daysSince >= 1 ? 'Feed today' : 'Fed'}</span><span className="sub">daily feeding at room temp</span></div>
      </div>

      <div className="grid split-alt">
        <div className="card">
          <strong>Log a feeding</strong>
          <label className="field" style={{ marginTop: 12 }}><span>Date & time</span><input type="datetime-local" value={form.date} onChange={(e) => set({ date: e.target.value })} /></label>
          <div className="row">
            <label className="field"><span>Starter (g)</span><input type="number" value={form.starter} onChange={(e) => set({ starter: Number(e.target.value) })} /></label>
            <label className="field"><span>Flour (g)</span><input type="number" value={form.flour} onChange={(e) => set({ flour: Number(e.target.value) })} /></label>
            <label className="field"><span>Water (g)</span><input type="number" value={form.water} onChange={(e) => set({ water: Number(e.target.value) })} /></label>
          </div>
          <div className="row">
            <label className="field"><span>Flour type</span>
              <select value={form.flourType} onChange={(e) => set({ flourType: e.target.value })}>
                {['bread flour', 'all-purpose', 'whole wheat', 'rye', 'spelt'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="field"><span>Temp (°F)</span><input type="number" value={form.tempF} onChange={(e) => set({ tempF: Number(e.target.value) })} /></label>
          </div>
          <label className="field"><span>Notes</span><input value={form.note} onChange={(e) => set({ note: e.target.value })} placeholder="rise time, smell, activity…" /></label>
          <label className="field" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={form.discardUsed} onChange={(e) => set({ discardUsed: e.target.checked })} />
            <span style={{ margin: 0 }}>Used the discard (crackers, pancakes…)</span>
          </label>

          <div className="section-title" style={{ marginTop: 6 }}>Weather</div>
          <div className="row" style={{ alignItems: 'center', marginBottom: 8 }}>
            <button className="btn sm" style={{ flex: '0 0 auto' }} onClick={fetchWeatherNow}><Icon name="cloud" size={15} /> Use current weather</button>
            {form.weather && <span className="chip accent">{form.weather.icon} {form.weather.description} · {form.weather.tempF}°F · {form.weather.humidity}% RH</span>}
            {weatherStatus && <span className="muted" style={{ fontSize: 13 }}>{weatherStatus}</span>}
          </div>
          <div className="row" style={{ marginBottom: 10 }}>
            <label className="field"><span>Air temp (°F)</span><input type="number" value={form.weather?.tempF ?? ''} onChange={(e) => setWeatherField({ tempF: Number(e.target.value) })} placeholder="—" /></label>
            <label className="field"><span>Humidity (%)</span><input type="number" value={form.weather?.humidity ?? ''} onChange={(e) => setWeatherField({ humidity: Number(e.target.value) })} placeholder="—" /></label>
            <label className="field"><span>Conditions</span>
              <select value={form.weather?.code ?? ''} onChange={(e) => { const code = Number(e.target.value); const [description, icon] = describeWeather(code); setWeatherField({ code, description, icon }) }}>
                <option value="">—</option>
                {[[0, 'Clear'], [2, 'Partly cloudy'], [3, 'Overcast'], [45, 'Fog'], [61, 'Rain'], [73, 'Snow'], [95, 'Thunderstorm']].map(([c, l]) => <option key={c} value={c}>{l}</option>)}
              </select>
            </label>
          </div>

          <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>Ratio {feedRatio(form)} · {num(hydration(form), 0)}% hydration</div>
          <button className="btn primary" onClick={() => { addFeeding(form); set({ note: '', weather: null }) }}>Log feeding</button>
        </div>

        <div>
          <div className="card">
            <strong>Hydration & temperature over time</strong>
            {chartData.length > 1 ? (
              <div style={{ height: 220, marginTop: 14 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ left: -12, right: 10, top: 6 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                    <XAxis dataKey="date" fontSize={12} stroke={c.axis} />
                    <YAxis fontSize={12} stroke={c.axis} />
                    <Tooltip {...TT} />
                    <Legend />
                    <Line type="monotone" dataKey="hydration" stroke={c.line2} strokeWidth={2.5} dot={{ r: 3 }} name="Hydration %" />
                    <Line type="monotone" dataKey="temp" stroke={c.line} strokeWidth={2.5} dot={{ r: 3 }} name="Temp °F" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="muted" style={{ marginTop: 12 }}>Log a couple feedings to see trends.</p>}
          </div>

          <div className="card" style={{ marginTop: 16, padding: 0 }}>
            {sorted.length === 0 ? <Empty icon="jar" title="No feedings logged yet" /> : (
              <table>
                <thead><tr><th>When</th><th>Ratio (s:f:w)</th><th>Hydration</th><th>Flour</th><th>Temp</th><th>Weather</th><th></th></tr></thead>
                <tbody>
                  {sorted.map((f) => (
                    <tr key={f.id}>
                      <td>{fmtDate(f.date, 'MMM d, h:mma')}{f.discardUsed && <span className="chip" style={{ marginLeft: 6, fontSize: 10 }}>discard used</span>}{f.note && <div className="muted" style={{ fontSize: 12 }}>{f.note}</div>}</td>
                      <td>{feedRatio(f)}</td>
                      <td>{num(hydration(f), 0)}%</td>
                      <td className="muted">{f.flourType}</td>
                      <td className="muted">{f.tempF}°F</td>
                      <td className="muted" style={{ fontSize: 13 }}>{f.weather ? <span title={f.weather.description}>{f.weather.icon} {f.weather.tempF}° · {f.weather.humidity}%</span> : '—'}</td>
                      <td style={{ textAlign: 'right' }}><button className="btn ghost sm" onClick={() => deleteFeeding(f.id)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      </>)}
    </>
  )
}
