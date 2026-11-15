import { useState } from 'react'
import { useStore } from '../store.js'
import { getPosition } from '../utils/weather.js'
import { PageHead } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { useDialogs } from '../components/Dialogs.jsx'

export default function Settings() {
  const settings = useStore((s) => s.settings)
  const { setSetting, resetAll } = useStore()
  const { confirm, notify } = useDialogs()
  const [locStatus, setLocStatus] = useState('')

  async function detectLocation() {
    setLocStatus('Requesting location…')
    try {
      const pos = await getPosition()
      setSetting('location', pos)
      setLocStatus(`Saved (${pos.lat.toFixed(2)}, ${pos.lon.toFixed(2)})`)
    } catch (e) {
      setLocStatus('⚠ ' + e.message)
    }
  }

  function exportData() {
    const state = useStore.getState()
    const { ingredients, recipes, cookLog, purchases, pantry, starterFeedings, shoppingList, mealPlan, settings } = state
    const blob = new Blob([JSON.stringify({ ingredients, recipes, cookLog, purchases, pantry, starterFeedings, shoppingList, mealPlan, settings }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `hearth-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }

  function importData(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        useStore.setState(data)
        notify('Data imported.', 'success')
      } catch {
        notify('That file could not be read as Hearth data.', 'danger')
      }
    }
    reader.readAsText(file)
  }

  return (
    <>
      <PageHead title="Settings" subtitle="Integrations, location & data" />

      <div className="card" style={{ marginBottom: 16 }}>
        <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon name="leaf" size={17} /> USDA FoodData Central</strong>
        <p className="muted" style={{ fontSize: 13, margin: '6px 0 12px' }}>
          Used to auto-fill ingredient nutrition, serving sizes and packaging. The shared <span className="kbd">DEMO_KEY</span> works
          immediately; for higher limits get a free key at <a href="https://fdc.nal.usda.gov/api-key-signup.html" target="_blank" rel="noreferrer">fdc.nal.usda.gov</a>.
        </p>
        <label className="field" style={{ maxWidth: 420 }}><span>API key</span>
          <input value={settings.usdaApiKey || ''} onChange={(e) => setSetting('usdaApiKey', e.target.value)} placeholder="DEMO_KEY" />
        </label>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon name="cloud" size={17} /> Weather (sourdough log)</strong>
        <p className="muted" style={{ fontSize: 13, margin: '6px 0 12px' }}>
          Attaches local conditions to starter feedings via Open-Meteo (free, no key). Save your location once so feedings
          can fetch weather without re-prompting.
        </p>
        <div className="row" style={{ alignItems: 'center' }}>
          <button className="btn" style={{ flex: '0 0 auto' }} onClick={detectLocation}><Icon name="pin" size={15} /> Detect my location</button>
          {settings.location && <span className="chip">Saved: {settings.location.lat.toFixed(2)}, {settings.location.lon.toFixed(2)}</span>}
          {locStatus && <span className="muted" style={{ fontSize: 13 }}>{locStatus}</span>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon name="database" size={17} /> Data</strong>
        <p className="muted" style={{ fontSize: 13, margin: '6px 0 12px' }}>Everything is stored locally in your browser. Export a backup or restore one.</p>
        <div className="row" style={{ alignItems: 'center', flex: '0 0 auto' }}>
          <button className="btn" style={{ flex: '0 0 auto' }} onClick={exportData}><Icon name="download" size={15} /> Export JSON</button>
          <label className="btn" style={{ flex: '0 0 auto', cursor: 'pointer' }}><Icon name="upload" size={15} /> Import JSON
            <input type="file" accept="application/json" style={{ display: 'none' }} onChange={importData} />
          </label>
          <button className="btn danger" style={{ flex: '0 0 auto' }} onClick={async () => { if (await confirm({ title: 'Reset all data?', message: 'This replaces everything with the sample data set.', danger: true, confirmLabel: 'Reset' })) resetAll() }}>Reset to sample data</button>
        </div>
      </div>
    </>
  )
}
