import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'

/** Cadre commun à tous les écrans : barre de titre collante + contenu scrollable. */
export function Screen({
  title,
  subtitle,
  back,
  action,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  /** Chemin de retour, ou `true` pour revenir en arrière dans l'historique. */
  back?: string | true
  action?: ReactNode
  children: ReactNode
  /** Barre d'action collée en bas de l'écran. */
  footer?: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-20 bg-bar text-white shadow-md">
        <div className="flex items-center gap-3 px-4 h-14">
          {back != null && (
            <button
              onClick={() => (back === true ? navigate(-1) : navigate(back))}
              className="-ml-2 p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              aria-label="Retour"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-bold uppercase tracking-wide truncate leading-tight">{title}</h1>
            {subtitle && <p className="text-xs text-white/65 truncate">{subtitle}</p>}
          </div>
          {action}
        </div>
      </header>

      <main className="flex-1 px-4 py-4 space-y-4">{children}</main>

      {footer && (
        <div className="sticky bottom-0 z-20 bg-canvas/95 backdrop-blur border-t border-veil/5 px-4 py-3">
          {footer}
        </div>
      )}
    </div>
  )
}

export function Tile({
  to,
  title,
  description,
  icon,
}: {
  to: string
  title: string
  description: string
  icon: ReactNode
}) {
  return (
    <Link to={to} className="card flex items-center gap-4 hover:border-accent transition">
      <div className="shrink-0 w-11 h-11 rounded-xl bg-accent-soft text-accent-ink grid place-items-center">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-veil/50">{description}</div>
      </div>
    </Link>
  )
}

export function EmptyState({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  return (
    <div className="card text-center py-10">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-veil/50 mt-1 mb-4">{hint}</p>
      {action}
    </div>
  )
}

/** Groupe de boutons radio, assez large pour le pouce. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  columns,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; hint?: string }[]
  columns?: number
}) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`rounded-xl px-3 py-2.5 text-sm font-medium border transition ${
              active
                ? 'bg-accent border-accent text-white'
                : 'bg-elevated border-veil/10 text-veil/70 hover:bg-veil/5'
            }`}
          >
            <span className="block">{option.label}</span>
            {option.hint && (
              <span className={`block text-[11px] ${active ? 'text-veil/70' : 'text-veil/40'}`}>
                {option.hint}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled = false,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  hint?: string
  disabled?: boolean
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className="w-full flex items-center justify-between gap-4 text-left disabled:opacity-45"
      role="switch"
      aria-checked={checked}
    >
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-xs text-veil/50">{hint}</span>}
      </span>
      <span
        className={`shrink-0 w-12 h-7 rounded-full p-0.5 transition ${
          checked ? 'bg-accent' : 'bg-veil/15'
        }`}
      >
        <span
          className={`block w-6 h-6 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </span>
    </button>
  )
}

export function euro(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  )
}
