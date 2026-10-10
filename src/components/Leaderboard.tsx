import type { LeaderboardRow } from '@/domain/types'

/**
 * Classement façon tableau de tournoi : position, joueur, score total par
 * rapport au par (rouge sous le par), et progression (« F » une fois les trous
 * terminés, sinon le nombre de trous joués).
 */
export function Leaderboard({
  rows,
  holeCount,
  compact = false,
}: {
  rows: LeaderboardRow[]
  holeCount: number
  /** Masque la ligne secondaire, pour l'encart de l'écran de saisie. */
  compact?: boolean
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-veil/10">
      <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_4.75rem_2.5rem] gap-x-2 items-center bg-bar px-3 py-1.5 font-display text-sm font-semibold uppercase tracking-wider text-white/80">
        <span>Pos</span>
        <span>Joueur</span>
        <span className="whitespace-nowrap text-right">Tot</span>
        <span className="text-right">Thru</span>
      </div>

      {rows.map((row, i) => {
        const started = row.holesPlayed > 0
        const under = row.toPar !== undefined && row.toPar < 0
        const tied = rows.filter((r) => r.rank === row.rank).length > 1
        return (
          <div
            key={row.key}
            className={`grid grid-cols-[2.25rem_minmax(0,1fr)_4.75rem_2.5rem] gap-x-2 items-center px-3 py-2 ${
              i % 2 === 1 ? 'bg-veil/[0.04]' : ''
            }`}
          >
            <span className="font-display text-lg font-bold tabular-nums text-veil/70">
              {started ? `${tied ? 'T' : ''}${row.rank}` : '–'}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-xl font-semibold uppercase leading-tight tracking-wide">
                {row.label}
              </span>
              {!compact && row.secondary && (
                <span className="block truncate text-xs text-veil/45">{row.secondary}</span>
              )}
            </span>
            <span
              className={`whitespace-nowrap text-right font-display text-2xl font-bold tabular-nums ${
                under ? 'text-under' : ''
              }`}
            >
              {started ? row.display : '–'}
            </span>
            <span className="text-right font-display text-base font-semibold tabular-nums text-veil/55">
              {row.holesPlayed >= holeCount ? 'F' : row.holesPlayed}
            </span>
          </div>
        )
      })}
    </div>
  )
}
