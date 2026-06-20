import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AdminApp from './components/AdminApp';

// Register the service worker so God Mode is installable as its own home-screen
// app (Android / desktop). iOS uses the apple-touch meta in hq.html.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
);
