/** @type {import('tailwindcss').Config} */

/** Les couleurs sémantiques pointent vers des variables CSS définies dans
 *  `index.css`, en deux jeux : thème sombre et thème clair. Les composants ne
 *  connaissent que le rôle d'une couleur (`surface`, `bar`, `under`…), jamais sa
 *  valeur — basculer de thème ne demande donc aucune classe conditionnelle. La
 *  syntaxe `rgb(var(--x) / <alpha-value>)` conserve les modificateurs d'opacité
 *  de Tailwind, par exemple `text-veil/40`. */
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /** Fond de la page. */
        canvas: token('canvas'),
        /** Fond des cartes. */
        surface: token('surface'),
        /** Fond des champs et des boutons secondaires. */
        elevated: token('elevated'),
        /** Bandeau de titre, bleu marine dans les deux thèmes comme sur les
         *  sites des circuits professionnels. */
        bar: token('bar'),
        /** Couleur de voile pour les textes atténués et les bordures : blanche
         *  sur fond sombre, sombre sur fond clair. */
        veil: token('veil'),
        /** Texte principal. */
        content: token('content'),
        /** Score sous le par : rouge, comme sur tous les classements de golf. */
        under: token('under'),

        accent: {
          DEFAULT: token('accent'),
          soft: token('accent-soft'),
          line: token('accent-line'),
          ink: token('accent-ink'),
          strong: token('accent-strong'),
        },
        warn: {
          soft: token('warn-soft'),
          line: token('warn-line'),
          ink: token('warn-ink'),
        },
        danger: {
          soft: token('danger-soft'),
          ink: token('danger-ink'),
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        /** Condensée et grasse, la typographie des tableaux de scores à la télé. */
        display: ['"Barlow Condensed"', 'system-ui', 'Roboto Condensed', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
