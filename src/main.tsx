import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import '@fontsource/barlow-condensed/latin-500.css'
import '@fontsource/barlow-condensed/latin-600.css'
import '@fontsource/barlow-condensed/latin-700.css'
import './index.css'

// Demande au navigateur de ne pas purger le stockage de l'app quand l'espace
// vient à manquer : les parcours saisis à la main et l'historique des parties
// n'existent nulle part ailleurs. Sans effet visible si le navigateur refuse.
void navigator.storage?.persist?.()

// Mises à jour. Le nouveau service worker s'active tout seul, mais la page déjà
// ouverte garde l'ancien code en mémoire. Deux choses règlent cela :
//  - en mode « autoUpdate », la page se recharge dès qu'une nouvelle version est
//    prête ;
//  - on va chercher cette nouvelle version à chaque retour sur l'app. Sans cela,
//    Android garde l'app en mémoire et ne la recharge jamais : on resterait sur
//    l'ancienne version jusqu'à la fermer complètement.
// Les données sont enregistrées à chaque action, le rechargement n'en perd aucune.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    const check = () => void registration.update()
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check()
    })
    window.setInterval(check, 30 * 60 * 1000)
  },
})

// HashRouter plutôt que BrowserRouter : l'app doit fonctionner telle quelle
// depuis n'importe quel hébergeur statique (ou un simple dossier) sans
// configuration de réécriture d'URL.
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
