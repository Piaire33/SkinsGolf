import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
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
