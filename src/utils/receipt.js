// Parse OCR'd receipt text into line items. Receipts are messy, so this is
// best-effort — the UI always lets the user review/edit before importing.
const SKIP = /\b(subtotal|total|tax|change|cash|card|visa|debit|credit|balance|tender|amount|savings|loyalty|points|thank|receipt|store|tel|phone|cashier|register|order|invoice|gst|hst|vat)\b/i

const PRICE = /(-?\$?\s?\d{1,4}[.,]\d{2})\s*[A-Z]?$/

function toNumber(s) {
  return parseFloat(String(s).replace(/[$\s]/g, '').replace(',', '.'))
}

export function parseReceipt(text) {
  const items = []
  for (let raw of String(text).split('\n')) {
    const line = raw.trim()
    if (!line || line.length < 3) continue
    if (SKIP.test(line)) continue
    const m = line.match(PRICE)
    if (!m) continue
    const price = toNumber(m[1])
    if (!isFinite(price) || price <= 0 || price > 999) continue
    // Name = text before the price, stripped of leading codes/quantities.
    let name = line.slice(0, m.index).trim()
    name = name.replace(/^\d{4,}\s*/, '') // leading SKU/barcode
    name = name.replace(/\s+\d+\s*(x|@)\s*[\d.]+$/i, '') // trailing "2 @ 1.50"
    name = name.replace(/[^A-Za-z0-9%&'.\- ]/g, '').replace(/\s+/g, ' ').trim()
    if (name.length < 2) continue
    items.push({ name: titleCase(name), price })
  }
  return items
}

function titleCase(s) {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

// Fuzzy-match a parsed name to an existing ingredient id.
export function matchIngredient(name, ingredients) {
  const n = name.toLowerCase()
  let best = null
  let bestScore = 0
  for (const ing of ingredients) {
    const a = ing.name.toLowerCase()
    let score = 0
    if (a === n) score = 1
    else if (n.includes(a) || a.includes(n)) score = 0.8
    else {
      const words = a.split(/\s+/)
      const hit = words.filter((w) => w.length > 2 && n.includes(w)).length
      score = hit / Math.max(words.length, 1) * 0.7
    }
    if (score > bestScore) { bestScore = score; best = ing }
  }
  return bestScore >= 0.5 ? best : null
}
