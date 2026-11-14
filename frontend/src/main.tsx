import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { NotificationProvider } from './components/ui/NotificationProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </StrictMode>,
)

// Registrasi PWA Service Worker untuk performa offline & installable app
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker terdaftar:', reg.scope);
      })
      .catch((err) => {
        console.error('[PWA] Gagal mendaftarkan Service Worker:', err);
      });
  });
}
