// Minimal line-icon set (Lucide-style geometry, MIT-spirit), drawn inline so
// there's no dependency and icons inherit currentColor. Stroke icons by default.
const PATHS = {
  dashboard: <><rect x="3" y="3" width="7" height="8" rx="1.2" /><rect x="14" y="3" width="7" height="5" rx="1.2" /><rect x="14" y="11" width="7" height="10" rx="1.2" /><rect x="3" y="14" width="7" height="7" rx="1.2" /></>,
  sparkle: <><path d="M12 3l1.6 5.2L19 9.8l-5.4 1.6L12 16l-1.6-4.6L5 9.8l5.4-1.6z" /><path d="M19 15l.7 2.1 2.1.7-2.1.7L19 21l-.7-2.5-2.1-.7 2.1-.7z" /></>,
  book: <><path d="M3 5.5A2 2 0 0 1 5 4h5v15H5a2 2 0 0 0-2 1.5z" /><path d="M21 5.5A2 2 0 0 0 19 4h-5v15h5a2 2 0 0 1 2 1.5z" /></>,
  calendar: <><rect x="3" y="4.5" width="18" height="16.5" rx="2" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></>,
  jar: <><path d="M7 7V5.2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1V7" /><path d="M6.5 7h11M6.5 7v11.5a2.5 2.5 0 0 0 2.5 2.5h6a2.5 2.5 0 0 0 2.5-2.5V7" /><path d="M6.5 13.5h11" /></>,
  box: <><path d="M3 5h18v3.5H3z" /><path d="M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5" /><path d="M10 12.5h4" /></>,
  cart: <><circle cx="9" cy="20" r="1.3" /><circle cx="18" cy="20" r="1.3" /><path d="M2 3.5h2.2l2.3 11.2a1.6 1.6 0 0 0 1.6 1.3h9.1a1.6 1.6 0 0 0 1.6-1.2L21.5 7H5.3" /></>,
  tag: <><path d="M3.5 11.7V4.5a1 1 0 0 1 1-1h7.2a2 2 0 0 1 1.4.6l7.3 7.3a2 2 0 0 1 0 2.8l-6.6 6.6a2 2 0 0 1-2.8 0L4.1 13.1a2 2 0 0 1-.6-1.4z" /><circle cx="8" cy="8" r="1.2" /></>,
  sliders: <><path d="M4 21v-6M4 11V3M12 21v-8M12 9V3M20 21v-5M20 12V3M2 15h4M10 9h4M18 16h4" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M20 6.5 9.5 17 4 11.5" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  camera: <><path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L19 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><circle cx="12" cy="12.5" r="3.2" /></>,
  cloud: <><path d="M5 6.5a3.5 3.5 0 0 1 6.4-1.2" /><path d="M9 5.5 8 7M12.5 6l-.6 1.4M4.5 9.5 6 9M15 9.5l-1.4-.4" /><path d="M7 19a3.5 3.5 0 0 1-.3-7A5 5 0 0 1 16.5 13h.5a3 3 0 0 1 0 6z" /></>,
  leaf: <><path d="M11 20A7 7 0 0 1 9.8 6.1C15 5 17 4.5 19 2.5c1 2.5 1.8 4.3 1.8 7.3 0 5.5-4.3 10.2-9.8 10.2z" /><path d="M2.5 21c0-3 2-5.4 5.5-6.2" /></>,
  flame: <path d="M12 3c.5 2.5 2 4.4 3.7 6 1.6 1.5 2.8 3.3 2.8 5.5a6.5 6.5 0 0 1-13 0c0-1.2.4-2.3 1-3a2.4 2.4 0 0 0 2.4 2.4A2.5 2.5 0 0 0 11.4 11c0-1.3-.6-2-1.1-3-.9-1.9-.1-3.7 1.7-5z" />,
  heart: <path d="M12 20.5 4.2 13a4.9 4.9 0 0 1 0-7 4.7 4.7 0 0 1 6.6 0l1.2 1.2 1.2-1.2a4.7 4.7 0 0 1 6.6 0 4.9 4.9 0 0 1 0 7z" />,
  search: <><circle cx="11" cy="11" r="7.2" /><path d="m21 21-4.3-4.3" /></>,
  download: <><path d="M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5" /><path d="M4 20.5h16" /></>,
  upload: <><path d="M12 14.5v-11M7.5 8 12 3.5 16.5 8" /><path d="M4 20.5h16" /></>,
  trash: <><path d="M3.5 6h17M8 6V4.2A1.7 1.7 0 0 1 9.7 2.5h4.6A1.7 1.7 0 0 1 16 4.2V6" /><path d="M18.5 6 17.7 20a2 2 0 0 1-2 1.9H8.3a2 2 0 0 1-2-1.9L5.5 6" /></>,
  pencil: <><path d="M12.5 20.5H21" /><path d="M16.4 3.6a2 2 0 0 1 2.9 2.9L7.6 18.2 3.5 19.4l1.2-4z" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5.2l3.2 2" /></>,
  pin: <><path d="M20 10.5c0 5.2-8 11-8 11s-8-5.8-8-11a8 8 0 0 1 16 0z" /><circle cx="12" cy="10.3" r="2.6" /></>,
  bell: <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  database: <><ellipse cx="12" cy="5.5" rx="8" ry="3" /><path d="M4 5.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6M4 11.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
  bowl: <><path d="M3 11.5h18a9 9 0 0 1-18 0z" /><path d="M8.5 8.2c-.5-1.5.4-3 1.8-3.5M12 7.7c-.4-1.7.6-3.2 2.1-3.6" /></>,
  sun: <><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.2M12 19.3v2.2M4.5 4.5l1.6 1.6M17.9 17.9l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.5 19.5l1.6-1.6M17.9 6.1l1.6-1.6" /></>,
  moon: <path d="M20.5 14.2A8.2 8.2 0 0 1 9.8 3.5a7.3 7.3 0 1 0 10.7 10.7z" />,
  grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.4" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.4" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.4" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.4" /></>,
  alert: <><path d="M10.3 3.4 1.9 17.8A2 2 0 0 0 3.6 21h16.8a2 2 0 0 0 1.7-3.2L13.7 3.4a2 2 0 0 0-3.4 0z" /><path d="M12 9v4.5M12 17.2h.01" /></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></>,
  menu: <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />,
  copy: <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
  merge: <><path d="M8 7 12 3l4 4" /><path d="M12 3v8a4 4 0 0 0 4 4h4" /><path d="M12 11a4 4 0 0 1-4 4H4" /><path d="m18 18 2-2-2-2M6 18l-2-2 2-2" /></>,
  link: <><path d="M10 13.5a4 4 0 0 0 6 .4l3-3a4 4 0 0 0-5.7-5.7l-1.7 1.7" /><path d="M14 10.5a4 4 0 0 0-6-.4l-3 3a4 4 0 0 0 5.7 5.7l1.7-1.7" /></>,
}

const FILLED = { heart: true, sparkle: true }

export default function Icon({ name, size = 18, fill = false, className = '', style }) {
  const d = PATHS[name]
  if (!d) return null
  const filled = fill && FILLED[name]
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      className={className} style={{ flexShrink: 0, display: 'block', ...style }}
      aria-hidden="true"
    >
      {d}
    </svg>
  )
}
