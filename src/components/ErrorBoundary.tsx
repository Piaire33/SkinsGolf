import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Dernier filet de sécurité : si un écran plante au rendu, React démonte tout et
 * laisse une page blanche dont on ne peut plus sortir. Ici on affiche un message
 * et un moyen de repartir. Les données vivent dans le stockage de l'appareil, pas
 * dans l'écran qui a planté : elles sont intactes.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Écran planté :', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide">
          Un problème est survenu
        </h1>
        <p className="max-w-xs text-sm text-veil/60">
          Tes parcours, joueurs et parties sont conservés sur ce téléphone. Reviens à
          l'accueil pour continuer.
        </p>
        <button
          className="btn-primary"
          onClick={() => {
            window.location.hash = '#/'
            window.location.reload()
          }}
        >
          Retour à l'accueil
        </button>
        <p className="max-w-xs break-words text-[11px] text-veil/30">{this.state.error.message}</p>
      </div>
    )
  }
}
