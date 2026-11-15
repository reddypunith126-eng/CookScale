import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { DialogProvider } from './components/Dialogs.jsx'
import './styles.css'

// Apply the saved theme before first paint to avoid a flash.
try {
  const saved = JSON.parse(localStorage.getItem('hearth-store'))
  document.documentElement.dataset.theme = saved?.state?.settings?.theme || 'dark'
} catch {
  document.documentElement.dataset.theme = 'dark'
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <DialogProvider>
        <App />
      </DialogProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
