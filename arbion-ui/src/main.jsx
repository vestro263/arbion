import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/shared.css'
import './styles/Trade.css'
import './styles/Portfolio.css'
import './styles/Login.css'
import './styles/Watchlist.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)