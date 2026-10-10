export type ThemeChoice = 'dark' | 'light' | 'system'

/** Identité visuelle, indépendante du mode clair/sombre. */
export type BrandStyle = 'dpworld' | 'pga'

export const STYLE_LABELS: Record<BrandStyle, string> = {
  dpworld: 'DP World Tour',
  pga: 'PGA Tour',
}

export const STYLE_HINTS: Record<BrandStyle, string> = {
  dpworld: 'Bleu marine et cobalt',
  pga: 'Bleu marine et rouge',
}

export const THEME_LABELS: Record<ThemeChoice, string> = {
  dark: 'Sombre',
  light: 'Clair',
  system: 'Système',
}

/** Couleur de la barre système Android. Le bandeau de titre est bleu marine dans
 *  les deux thèmes : la barre système s'y raccorde sans coupure. */
const BAR_COLOR: Record<BrandStyle, string> = {
  dpworld: '#003c80',
  pga: '#00205b',
}

export function systemTheme(): 'dark' | 'light' {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function resolveTheme(choice: ThemeChoice): 'dark' | 'light' {
  return choice === 'system' ? systemTheme() : choice
}

/**
 * Pose la classe de thème sur `<html>` et met la couleur de la barre système
 * en accord. Les couleurs elles-mêmes vivent dans `index.css` sous forme de
 * variables CSS : rien d'autre dans l'app n'a besoin de connaître le thème.
 */
export function applyTheme(choice: ThemeChoice, style: BrandStyle = 'dpworld'): void {
  const resolved = resolveTheme(choice)
  const root = document.documentElement
  root.classList.toggle('theme-light', resolved === 'light')
  root.classList.toggle('theme-dark', resolved === 'dark')
  root.classList.toggle('style-dpworld', style === 'dpworld')
  root.classList.toggle('style-pga', style === 'pga')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR_COLOR[style])
}

/** Prévient quand le thème du système change, utile en mode « Système ». */
export function watchSystemTheme(onChange: () => void): () => void {
  const query = window.matchMedia?.('(prefers-color-scheme: light)')
  if (!query) return () => {}
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
