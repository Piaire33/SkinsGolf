import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// `npm run dev:lan` / `preview:lan` servent l'app en HTTPS sur l'IP locale :
// c'est la seule façon pour Chrome Android d'enregistrer le service worker
// (donc de proposer « Ajouter à l'écran d'accueil ») sans déployer sur un hébergeur.
const lan = process.argv.includes('--host')

/**
 * Numéro de version « majeur.mineur.release ».
 * Majeur et mineur se règlent à la main dans package.json (champ "version").
 * La release est le nombre de commits : elle s'incrémente toute seule à chaque
 * publication, sans rien à penser. Hors dépôt git, on retombe sur le dernier
 * chiffre de package.json.
 */
function appVersion(): string {
  const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
  const [major, minor, patch] = String(pkg.version).split('.')
  let release = patch ?? '0'
  try {
    release = execSync('git rev-list --count HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    /* pas de dépôt git : on garde le numéro de package.json */
  }
  return `${major}.${minor}.${release}`
}

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(appVersion()) },
  // Permet à un outil externe d'imposer le port via la variable d'environnement.
  server: { port: Number(process.env.PORT) || 5173 },
  preview: { port: Number(process.env.PORT) || 4173 },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    ...(lan ? [basicSsl()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      // L'enregistrement est fait dans src/main.tsx, pour pouvoir chercher les mises
      // à jour au retour sur l'app. Le script injecté par défaut ne le permet pas.
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'],
      manifest: {
        name: 'SkinsGolf — cartes de score',
        short_name: 'SkinsGolf',
        description: 'Saisie de scores de golf et calcul de skins game en euros, hors-ligne.',
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#060f20',
        theme_color: '#003c80',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Les parcours importés depuis l'API sont copiés dans le store local, donc
        // aucune requête réseau n'est nécessaire pendant une partie.
        navigateFallback: 'index.html',
      },
    }),
  ],
})
