import { useStore } from './store.js'

// Chart colors can't read CSS variables (SVG attributes), so mirror the theme here.
export const CHART = {
  dark: {
    grid: 'rgba(255,255,255,0.055)', axis: '#89826f',
    tipBg: '#1a1712', tipBorder: 'rgba(255,255,255,0.14)', tipText: '#efe9dc',
    cursor: 'rgba(255,255,255,0.04)',
    cooks: '#e6e0d2', spend: '#c07a7f', line: '#c07a7f', line2: '#8d8674',
    macros: ['#e6e0d2', '#9a9280', '#5f5949', '#c07a7f'],
  },
  light: {
    grid: 'rgba(23,21,15,0.06)', axis: '#9a9484',
    tipBg: '#ffffff', tipBorder: 'rgba(23,21,15,0.14)', tipText: '#17150f',
    cursor: 'rgba(23,21,15,0.035)',
    cooks: '#1f1c16', spend: '#7c2d32', line: '#7c2d32', line2: '#8a8474',
    macros: ['#1f1c16', '#6b6557', '#a8a294', '#7c2d32'],
  },
}

export function useChart() {
  const theme = useStore((s) => s.settings.theme) || 'light'
  return CHART[theme] || CHART.light
}

export function tooltipStyle(c) {
  return {
    contentStyle: { background: c.tipBg, border: `1px solid ${c.tipBorder}`, borderRadius: 10, color: c.tipText, boxShadow: '0 10px 30px rgba(0,0,0,0.35)' },
    labelStyle: { color: c.tipText },
    itemStyle: { color: c.tipText },
    cursor: { fill: c.cursor, stroke: c.tipBorder },
  }
}
