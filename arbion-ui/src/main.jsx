import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/shared.css'
import './styles/Trade.css'
import './styles/Portfolio.css'
import './styles/Login.css'
import './styles/Watchlist.css'
import App from './App.jsx'
import { GoogleOAuthProvider } from "@react-oauth/google";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>
)