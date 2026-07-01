import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted Inter: the CSP (style-src 'self') blocks Google Fonts, and
// serving fonts ourselves avoids leaking student IPs to Google anyway.
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import Root from './Root.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
