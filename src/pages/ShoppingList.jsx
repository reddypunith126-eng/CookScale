import { useMemo, useState } from 'react'
import { useStore, currentPricePerBase } from '../store.js'
import { convert, unitLabel, compatibleUnits } from '../utils/units.js'
import { money, num, fmtDate, todayISO } from '../utils/format.js'
import { PageHead, Empty, Modal } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import ReceiptScan from '../components/ReceiptScan.jsx'
import { useDialogs } from '../components/Dialogs.jsx'

export default function ShoppingList() {
  const shoppingList = useStore((s) => s.shoppingList)
  const ingredients = useStore((s) => s.ingredients)
  const shoppingTrips = useStore((s) => s.shoppingTrips || [])
  const { toggleShoppingItem, removeShoppingItem, addShoppingItem, updateShoppingItem, setAllShoppingChecked, checkoutShopping } = useStore()
  const { notify } = useDialogs()
  const [addId, setAddId] = useState('')
  const [scanOpen, setScanOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const ingredientsById = useMemo(() => Object.fromEntries(ingredients.map((i) => [i.id, i])), [ingredients])

  // Estimated cost from price history when the item has no entered price yet.
  const estCost = (item) => {
    if (item.price > 0) return item.price
    const ing = ingredientsById[item.ingredientId]
    const ppb = currentPricePerBase(ing)
    if (ppb == null) return null
    const baseQty = convert(item.quantity, item.unit, ing.baseUnit)
    return baseQty == null ? null : baseQty * ppb
  }

  const total = shoppingList.reduce((a, i) => a + (estCost(i) || 0), 0)
  const checked = shoppingList.filter((i) => i.checked)
  const checkedTotal = checked.reduce((a, i) => a + (estCost(i) || 0), 0)
  const allChecked = shoppingList.length > 0 && checked.length === shoppingList.length

  // Bulk: copy estimated prices into the editable "price paid" field for checked items.
  function fillEstimated() {
    checked.forEach((i) => { if (!(i.price > 0)) { const e = estCost(i); if (e != null) updateShoppingItem(i.id, { price: +e.toFixed(2) }) } })
  }

  const recentTrips = [...shoppingTrips].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)

  return (
    <>
      <PageHead title="Shopping list" subtitle={`${shoppingList.length} items · ${money(total)} estimated`}>
        <button className="btn" onClick={() => setScanOpen(true)}><Icon name="camera" size={16} /> Scan receipt</button>
        <button className="btn primary" onClick={() => setCheckoutOpen(true)} disabled={!checked.length}>
          <Icon name="check" size={16} /> Check out{checked.length ? ` (${checked.length})` : ''}
        </button>
      </PageHead>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <label className="field" style={{ marginBottom: 0, flex: 2 }}><span>Quick add</span>
            <select value={addId} onChange={(e) => setAddId(e.target.value)}>
              <option value="">— select ingredient —</option>
              {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </label>
          <button className="btn" style={{ flex: '0 0 auto' }} disabled={!addId} onClick={() => {
            const ing = ingredientsById[addId]; addShoppingItem({ ingredientId: addId, quantity: 1, unit: ing.baseUnit, note: '' }); setAddId('')
          }}>Add</button>
        </div>
      </div>

      {shoppingList.length === 0 ? (
        <Empty icon="cart" title="Your shopping list is empty">Add items here, scan a receipt, or push them from a recipe or recommendations.</Empty>
      ) : (
        <>
          {checked.length > 0 && (
            <div className="toolbar" style={{ marginBottom: 12 }}>
              <span className="muted" style={{ fontSize: 13 }}>{checked.length} checked · {money(checkedTotal)}</span>
              <button className="btn sm" onClick={fillEstimated}>Fill estimated prices</button>
            </div>
          )}
          <div className="card" style={{ padding: 0 }}>
            <table>
              <thead><tr>
                <th style={{ width: 38 }}><input type="checkbox" style={{ width: 'auto' }} checked={allChecked} onChange={(e) => setAllShoppingChecked(e.target.checked)} /></th>
                <th>Item</th><th>Qty</th><th>For</th><th style={{ textAlign: 'right' }}>Price paid</th><th></th>
              </tr></thead>
              <tbody>
                {shoppingList.map((item) => {
                  const ing = ingredientsById[item.ingredientId]
                  const units = ing ? compatibleUnits(ing.baseUnit) : [item.unit]
                  const est = estCost(item)
                  return (
                    <tr key={item.id} style={{ opacity: item.checked ? 0.6 : 1 }}>
                      <td><input type="checkbox" style={{ width: 'auto' }} checked={item.checked} onChange={() => toggleShoppingItem(item.id)} /></td>
                      <td style={{ fontWeight: 600 }}>{ing?.name || 'unknown'}</td>
                      <td>
                        <div className="row" style={{ gap: 5 }}>
                          <input style={{ width: 66 }} type="number" step="any" value={item.quantity} onChange={(e) => updateShoppingItem(item.id, { quantity: Number(e.target.value) })} />
                          <select style={{ width: 76 }} value={item.unit} onChange={(e) => updateShoppingItem(item.id, { unit: e.target.value })}>
                            {units.map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className="muted">{item.note || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <input style={{ width: 86, textAlign: 'right' }} type="number" step="any" placeholder={est != null ? '~' + est.toFixed(2) : 'price'} value={item.price ?? ''} onChange={(e) => updateShoppingItem(item.id, { price: e.target.value === '' ? null : Number(e.target.value) })} />
                      </td>
                      <td style={{ textAlign: 'right' }}><button className="btn ghost sm" onClick={() => removeShoppingItem(item.id)}><Icon name="x" size={14} /></button></td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr><td colSpan={4} style={{ textAlign: 'right', fontWeight: 600 }}>Estimated total</td><td style={{ textAlign: 'right', fontWeight: 750 }} className="price-tag">{money(total)}</td><td></td></tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
        Check items off as you shop, tap <b>Fill estimated prices</b> or enter what you paid, then <b>Check out</b> to confirm payment — that logs the spend, updates price history, and stocks your pantry.
      </p>

      {recentTrips.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <strong>Recent shopping trips</strong>
          <table style={{ marginTop: 10 }}>
            <tbody>
              {recentTrips.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{fmtDate(t.date)}</td>
                  <td className="muted">{t.store || 'Groceries'}</td>
                  <td className="muted">{t.itemCount} item{t.itemCount !== 1 ? 's' : ''}</td>
                  <td style={{ textAlign: 'right' }} className="price-tag">{money(t.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {scanOpen && <ReceiptScan onClose={() => setScanOpen(false)} />}
      {checkoutOpen && (
        <CheckoutModal
          items={checked}
          ingredientsById={ingredientsById}
          estCost={estCost}
          onClose={() => setCheckoutOpen(false)}
          onConfirm={(store, date) => {
            const paid = checkoutShopping(checked.map((i) => i.id), { store, date })
            setCheckoutOpen(false)
            notify(`Trip logged — ${money(paid)} at ${store || 'Groceries'}. Pantry stocked.`, 'success')
          }}
        />
      )}
    </>
  )
}

function CheckoutModal({ items, ingredientsById, estCost, onClose, onConfirm }) {
  const { updateShoppingItem } = useStore()
  const [store, setStore] = useState('')
  const [date, setDate] = useState(todayISO())
  const priced = items.map((i) => ({ ...i, paid: i.price > 0 ? i.price : (estCost(i) || 0) }))
  const total = priced.reduce((a, i) => a + i.paid, 0)

  return (
    <Modal title="Confirm payment" onClose={onClose}>
      <p className="muted" style={{ marginTop: 0, fontSize: 14 }}>Review what you paid, then confirm — this records the trip, updates each ingredient's price history, and adds everything to your pantry.</p>
      <div className="row">
        <label className="field"><span>Store</span><input autoFocus value={store} onChange={(e) => setStore(e.target.value)} placeholder="e.g. Whole Foods" /></label>
        <label className="field"><span>Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      </div>
      <div className="card" style={{ padding: 0, marginBottom: 8 }}>
        <table>
          <thead><tr><th>Item</th><th>Qty</th><th style={{ textAlign: 'right' }}>Paid</th></tr></thead>
          <tbody>
            {priced.map((i) => (
              <tr key={i.id}>
                <td style={{ fontWeight: 600 }}>{ingredientsById[i.ingredientId]?.name || 'unknown'}</td>
                <td className="muted">{num(i.quantity)} {unitLabel(i.unit)}</td>
                <td style={{ textAlign: 'right', width: 100 }}>
                  <input style={{ width: 86, textAlign: 'right' }} type="number" step="any" value={i.price ?? +i.paid.toFixed(2)} onChange={(e) => updateShoppingItem(i.id, { price: e.target.value === '' ? null : Number(e.target.value) })} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={2} style={{ textAlign: 'right', fontWeight: 600 }}>Total paid</td><td style={{ textAlign: 'right', fontWeight: 750 }} className="price-tag">{money(total)}</td></tr></tfoot>
        </table>
      </div>
      <div className="dialog-actions">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={() => onConfirm(store, date)}><Icon name="check" size={16} /> Confirm payment · {money(total)}</button>
      </div>
    </Modal>
  )
}
