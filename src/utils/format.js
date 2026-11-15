import { format, parseISO } from 'date-fns'

export function money(n) {
  if (n == null || isNaN(n)) return '—'
  return '$' + Number(n).toFixed(2)
}

export function num(n, digits = 1) {
  if (n == null || isNaN(n)) return '—'
  const v = Number(n)
  return v.toFixed(v % 1 === 0 ? 0 : digits)
}

export function fmtDate(iso, pattern = 'MMM d, yyyy') {
  if (!iso) return '—'
  try {
    return format(typeof iso === 'string' ? parseISO(iso) : iso, pattern)
  } catch {
    return String(iso)
  }
}

export function todayISO() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

// Real current date at local midnight (so "today" comparisons are timezone-correct).
export function today() {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

// Title Case for ingredient names — capitalizes each word, incl. after hyphens.
export function titleCase(s) {
  return String(s || '').toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase())
}

const UNICODE_FRACTIONS = {
  '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8,
  '⅙': 1 / 6, '⅚': 5 / 6, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
}

// Parse typed quantities: "1 1/2", "1/2", "1½", "1.5", "2" → number (or null).
export function parseFraction(input) {
  if (typeof input === 'number') return input
  let s = String(input).trim()
  if (!s) return null
  s = s.replace(/(\d)\s*([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/g, '$1 $2') // split "1½" → "1 ½"
  let total = 0
  let matched = false
  for (const tok of s.split(/\s+/)) {
    if (UNICODE_FRACTIONS[tok] != null) { total += UNICODE_FRACTIONS[tok]; matched = true; continue }
    if (/^\d+\/\d+$/.test(tok)) { const [a, b] = tok.split('/').map(Number); if (b) { total += a / b; matched = true }; continue }
    const n = parseFloat(tok)
    if (!isNaN(n)) { total += n; matched = true }
  }
  return matched ? total : null
}
