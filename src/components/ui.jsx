import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'

export function PageHead({ title, subtitle, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="row" style={{ flex: '0 0 auto' }}>{children}</div>}
    </div>
  )
}

export function Stat({ label, value, sub }) {
  return (
    <div className="card stat">
      <span className="label">{label}</span>
      <span className="value">{value}</span>
      {sub && <span className="sub">{sub}</span>}
    </div>
  )
}

export function Stars({ value = 0, onChange }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={'star' + (i <= value ? '' : ' empty')}
          style={{ cursor: onChange ? 'pointer' : 'default', fontSize: 16 }}
          onClick={onChange ? () => onChange(i === value ? 0 : i) : undefined}
        >
          ★
        </span>
      ))}
    </span>
  )
}

const TAG_LIBRARY = [
  'vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'indian', 'italian', 'mexican', 'thai',
  'bread', 'baking', 'dessert', 'breakfast', 'soup', 'salad', 'quick', 'high-protein', 'low-carb',
]
export { TAG_LIBRARY }

export function Empty({ icon = 'bowl', title, children }) {
  return (
    <div className="card empty">
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--faint)' }}>
        <Icon name={icon} size={34} />
      </div>
      <div style={{ fontWeight: 650, fontSize: 16, color: 'var(--text)' }}>{title}</div>
      {children && <div style={{ marginTop: 8 }}>{children}</div>}
    </div>
  )
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn ghost" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export function BackLink({ to, children }) {
  return <Link to={to} className="back-link">← {children}</Link>
}

export function Drawer({ title, onClose, children }) {
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer" role="dialog" aria-label={title}>
        <div className="drawer-head">
          <h2>{title}</h2>
          <button className="btn ghost" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
    </>
  )
}
