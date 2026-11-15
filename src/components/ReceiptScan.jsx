import { useState } from 'react'
import Tesseract from 'tesseract.js'
import { useStore } from '../store.js'
import { parseReceipt, matchIngredient } from '../utils/receipt.js'
import { money, todayISO } from '../utils/format.js'
import { Modal } from './ui.jsx'
import { useDialogs } from './Dialogs.jsx'

// Scan a receipt image entirely in-browser (Tesseract WASM — nothing uploaded),
// parse line items, let the user map them to ingredients, then add to the list.
export default function ReceiptScan({ onClose }) {
  const ingredients = useStore((s) => s.ingredients)
  const { addShoppingItem, addIngredient } = useStore()
  const { notify } = useDialogs()
  const [stage, setStage] = useState('upload') // upload | scanning | review
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState('')
  const [rows, setRows] = useState([])
  const [store, setStore] = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setStage('scanning'); setProgress(0)
    try {
      const { data } = await Tesseract.recognize(file, 'eng', {
        logger: (m) => { if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100)) },
      })
      const parsed = parseReceipt(data.text)
      setRows(parsed.map((p) => {
        const match = matchIngredient(p.name, ingredients)
        return { name: p.name, price: p.price, ingredientId: match?.id || '', unit: match?.baseUnit || 'each', quantity: 1, include: true }
      }))
      setStage('review')
    } catch (err) {
      notify('OCR failed: ' + err.message, 'danger')
      setStage('upload')
    }
  }

  const update = (i, patch) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))

  function importAll() {
    rows.filter((r) => r.include).forEach((r) => {
      let ingredientId = r.ingredientId
      if (!ingredientId && r.name) ingredientId = addIngredient({ name: r.name })
      addShoppingItem({ ingredientId, quantity: Number(r.quantity) || 1, unit: r.unit, price: r.price, note: store ? `${store} receipt` : 'receipt' })
    })
    onClose()
  }

  const total = rows.filter((r) => r.include).reduce((a, r) => a + (r.price || 0), 0)

  return (
    <Modal title="Scan a receipt" onClose={onClose}>
      {stage === 'upload' && (
        <div>
          <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
            Upload a photo of your receipt. Text recognition runs entirely in your browser — the image is never uploaded anywhere.
          </p>
          <label className="btn primary" style={{ cursor: 'pointer' }}>Choose receipt image
            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />
          </label>
        </div>
      )}

      {stage === 'scanning' && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          {preview && <img src={preview} alt="" style={{ maxHeight: 160, borderRadius: 10, marginBottom: 16 }} />}
          <div className="bar" style={{ maxWidth: 320, margin: '0 auto' }}><i style={{ width: progress + '%' }} /></div>
          <p className="muted" style={{ marginTop: 10 }}>Reading receipt… {progress}%</p>
        </div>
      )}

      {stage === 'review' && (
        <div>
          <div className="row" style={{ marginBottom: 12 }}>
            <label className="field" style={{ marginBottom: 0 }}><span>Store (optional)</span><input value={store} onChange={(e) => setStore(e.target.value)} placeholder="e.g. Whole Foods" /></label>
          </div>
          {rows.length === 0 ? (
            <p className="muted">No line items detected. Receipts vary a lot — try a clearer, straighter photo.</p>
          ) : (
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              <table>
                <thead><tr><th></th><th>Item</th><th>Match to ingredient</th><th style={{ textAlign: 'right' }}>Price</th></tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={{ opacity: r.include ? 1 : 0.4 }}>
                      <td><input type="checkbox" style={{ width: 'auto' }} checked={r.include} onChange={() => update(i, { include: !r.include })} /></td>
                      <td><input value={r.name} onChange={(e) => update(i, { name: e.target.value })} /></td>
                      <td>
                        <select value={r.ingredientId} onChange={(e) => update(i, { ingredientId: e.target.value })}>
                          <option value="">＋ create “{r.name}”</option>
                          {ingredients.map((ing) => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
                        </select>
                      </td>
                      <td style={{ textAlign: 'right' }}><input style={{ width: 80, textAlign: 'right' }} type="number" step="any" value={r.price} onChange={(e) => update(i, { price: Number(e.target.value) })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="row" style={{ marginTop: 14, alignItems: 'center' }}>
            <button className="btn primary" style={{ flex: '0 0 auto' }} disabled={!rows.some((r) => r.include)} onClick={importAll}>
              Add {rows.filter((r) => r.include).length} items · {money(total)}
            </button>
            <span className="muted" style={{ fontSize: 13 }}>Prices update each ingredient's history when you receive them into the pantry.</span>
          </div>
        </div>
      )}
    </Modal>
  )
}
