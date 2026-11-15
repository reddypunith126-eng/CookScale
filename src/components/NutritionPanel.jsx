import { NUTRIENTS, MACRO_KEYS, DAILY_VALUES } from '../utils/nutrition.js'
import { num } from '../utils/format.js'
import { useChart } from '../theme.js'

export function MacroBar({ nutrition }) {
  const c = useChart()
  const MACRO_COLORS = { protein: c.macros[0], carbs: c.macros[1], fat: c.macros[2], fiber: c.macros[3] }
  const total = MACRO_KEYS.reduce((a, k) => a + (nutrition[k] || 0), 0) || 1
  return (
    <div>
      <div className="bar" style={{ display: 'flex', height: 12 }}>
        {MACRO_KEYS.map((k) => (
          <i
            key={k}
            style={{ width: `${((nutrition[k] || 0) / total) * 100}%`, background: MACRO_COLORS[k] }}
            title={`${k}: ${num(nutrition[k])}g`}
          />
        ))}
      </div>
      <div className="chips" style={{ marginTop: 8 }}>
        {MACRO_KEYS.map((k) => (
          <span key={k} className="chip">
            <span className="macro-dot" style={{ background: MACRO_COLORS[k] }} />
            {k} {num(nutrition[k])}g
          </span>
        ))}
      </div>
    </div>
  )
}

export default function NutritionPanel({ nutrition, label = 'Per serving' }) {
  const groups = {
    macro: NUTRIENTS.filter((n) => n.group === 'macro'),
    vitamin: NUTRIENTS.filter((n) => n.group === 'vitamin'),
    mineral: NUTRIENTS.filter((n) => n.group === 'mineral'),
  }
  return (
    <div>
      <div className="row" style={{ alignItems: 'baseline', marginBottom: 12 }}>
        <div className="stat" style={{ flex: '0 0 auto' }}>
          <span className="value">{num(nutrition.calories)}</span>
          <span className="label">kcal · {label.toLowerCase()}</span>
        </div>
      </div>
      <MacroBar nutrition={nutrition} />
      <hr className="divider" />
      {Object.entries(groups).map(([group, items]) => (
        <div key={group} style={{ marginBottom: 14 }}>
          <div className="section-title" style={{ margin: '0 0 8px' }}>{group === 'macro' ? 'Macros' : group + 's'}</div>
          <table>
            <tbody>
              {items.map((nu) => {
                const v = nutrition[nu.key] || 0
                const dv = DAILY_VALUES[nu.key]
                return (
                  <tr key={nu.key}>
                    <td style={{ padding: '6px 10px' }}>{nu.label}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600 }}>
                      {num(v)} {nu.unit}
                    </td>
                    <td style={{ padding: '6px 10px', width: 60, textAlign: 'right' }} className="muted">
                      {dv ? Math.round((v / dv) * 100) + '%' : ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
      <p className="muted" style={{ fontSize: 12 }}>% of a 2,000 kcal reference daily intake.</p>
    </div>
  )
}
