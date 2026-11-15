import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './store.js'
import { useBulkImport } from './utils/bulkImport.js'
import Dashboard from './pages/Dashboard.jsx'
import Recipes from './pages/Recipes.jsx'
import RecipeDetail from './pages/RecipeDetail.jsx'
import RecipeForm from './pages/RecipeForm.jsx'
import Ingredients from './pages/Ingredients.jsx'
import IngredientDetail from './pages/IngredientDetail.jsx'
import Pantry from './pages/Pantry.jsx'
import Recommendations from './pages/Recommendations.jsx'
import ShoppingList from './pages/ShoppingList.jsx'
import MealPlanner from './pages/MealPlanner.jsx'
import Sourdough from './pages/Sourdough.jsx'
import Settings from './pages/Settings.jsx'
import BulkImport from './pages/BulkImport.jsx'
import Dedupe from './pages/Dedupe.jsx'
import Icon from './components/Icon.jsx'

const NAV = [
  { section: 'Overview' },
  { to: '/', icon: 'dashboard', label: 'Dashboard', end: true },
  { to: '/recommendations', icon: 'sparkle', label: 'What can I make?' },
  { section: 'Cook' },
  { to: '/recipes', icon: 'book', label: 'Recipes' },
  { to: '/planner', icon: 'calendar', label: 'Meal planner' },
  { to: '/sourdough', icon: 'jar', label: 'Sourdough' },
  { section: 'Kitchen' },
  { to: '/pantry', icon: 'box', label: 'Pantry' },
  { to: '/shopping', icon: 'cart', label: 'Shopping list' },
  { to: '/ingredients', icon: 'tag', label: 'Ingredients & prices' },
  { section: 'Tools' },
  { to: '/import', icon: 'download', label: 'Bulk import', bulkBadge: true },
  { to: '/dedupe', icon: 'copy', label: 'Duplicates' },
  { to: '/settings', icon: 'sliders', label: 'Settings' },
]

// Primary mobile tabs; everything else lives in the "More" sheet.
const TABS = [
  { to: '/', icon: 'dashboard', label: 'Home', end: true },
  { to: '/recipes', icon: 'book', label: 'Recipes' },
  { to: '/planner', icon: 'calendar', label: 'Planner' },
  { to: '/shopping', icon: 'cart', label: 'Shopping' },
]
const TAB_PATHS = ['/', '/recipes', '/planner', '/shopping']

function useBulkBadge() {
  const status = useBulkImport((s) => s.status)
  const items = useBulkImport((s) => s.items)
  const running = status === 'discovering' || status === 'running'
  if (status === 'idle') return null
  const done = items.filter((i) => i.status !== 'pending' && i.status !== 'fetching').length
  const text = status === 'discovering' ? '…' : running ? `${done}/${items.length}` : status === 'done' ? `${items.length} ✓` : '!'
  return { running, text }
}

function BulkBadge() {
  const badge = useBulkBadge()
  if (!badge) return null
  return <span className={'badge' + (badge.running ? ' pulse' : '')}>{badge.text}</span>
}

function NavLinks({ items, onNavigate }) {
  return items.map((item, i) =>
    item.section ? (
      <div key={i} className="nav-section">{item.section}</div>
    ) : (
      <NavLink key={item.to} to={item.to} end={item.end} className="nav-link" onClick={onNavigate}>
        <span className="ic"><Icon name={item.icon} size={18} /></span>
        <span>{item.label}</span>
        {item.bulkBadge && <BulkBadge />}
      </NavLink>
    ),
  )
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="logo"><Icon name="flame" size={20} /></span>
        <span>Hearth</span>
      </div>
      <nav><NavLinks items={NAV} /></nav>
      <ThemeToggle />
    </aside>
  )
}

function TabBar({ onMore, moreOpen }) {
  const location = useLocation()
  const badge = useBulkBadge()
  // Highlight "More" when the current page isn't one of the four main tabs.
  const onMorePage = !TAB_PATHS.includes(location.pathname) && !location.pathname.startsWith('/recipes')
  return (
    <nav className="tabbar" aria-label="Main navigation">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} onClick={() => moreOpen && onMore(false)}>
          <Icon name={t.icon} size={21} />
          <span>{t.label}</span>
        </NavLink>
      ))}
      <button className={moreOpen || onMorePage ? 'open' : ''} onClick={() => onMore(!moreOpen)} aria-expanded={moreOpen}>
        <Icon name="menu" size={21} />
        <span>More</span>
        {badge && <span className={'badge' + (badge.running ? ' pulse' : '')}>{badge.text}</span>}
      </button>
    </nav>
  )
}

function MoreSheet({ onClose }) {
  const items = NAV.filter((n) => n.section || !TAB_PATHS.includes(n.to))
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label="More pages">
        <div className="sheet-grab" />
        <nav><NavLinks items={items} onNavigate={onClose} /></nav>
        <ThemeToggle />
      </div>
    </>
  )
}

function ThemeToggle() {
  const theme = useStore((s) => s.settings.theme) || 'light'
  const setSetting = useStore((s) => s.setSetting)
  return (
    <div className="theme-toggle" role="group" aria-label="Color theme">
      <button className={theme === 'light' ? 'on' : ''} onClick={() => setSetting('theme', 'light')} aria-pressed={theme === 'light'}>
        <span className="ic"><Icon name="sun" size={16} /></span>
        <span>Light</span>
      </button>
      <button className={theme === 'dark' ? 'on' : ''} onClick={() => setSetting('theme', 'dark')} aria-pressed={theme === 'dark'}>
        <span className="ic"><Icon name="moon" size={16} /></span>
        <span>Dark</span>
      </button>
    </div>
  )
}

export default function App() {
  const theme = useStore((s) => s.settings.theme) || 'light'
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  useEffect(() => setMoreOpen(false), [location.pathname])
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        {/* Keyed by path so each page mounts with the route-in animation. */}
        <div key={location.pathname} className="route">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/recipes" element={<Recipes />} />
          <Route path="/recipes/new" element={<RecipeForm />} />
          <Route path="/recipes/:id" element={<RecipeDetail />} />
          <Route path="/recipes/:id/edit" element={<RecipeForm />} />
          <Route path="/planner" element={<MealPlanner />} />
          <Route path="/sourdough" element={<Sourdough />} />
          <Route path="/pantry" element={<Pantry />} />
          <Route path="/shopping" element={<ShoppingList />} />
          <Route path="/ingredients" element={<Ingredients />} />
          <Route path="/ingredients/:id" element={<IngredientDetail />} />
          <Route path="/import" element={<BulkImport />} />
          <Route path="/dedupe" element={<Dedupe />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
        </div>
      </main>
      <TabBar onMore={setMoreOpen} moreOpen={moreOpen} />
      {moreOpen && <MoreSheet onClose={() => setMoreOpen(false)} />}
    </div>
  )
}
