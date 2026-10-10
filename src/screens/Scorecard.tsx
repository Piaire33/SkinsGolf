import { Link, useParams } from 'react-router-dom'
import { Screen } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { roundHoles, totalPar } from '@/domain/handicap'
import { courseLabel } from '@/domain/course'
import { PICKED_UP } from '@/domain/skins'
import type { Hole, Round } from '@/domain/types'

interface Half {
  /** « Aller », « Retour », ou vide pour un parcours de 9 trous. */
  label: string
  from: number
  to: number
  /** En-tête de la colonne de sous-total. */
  subtotal: string
  /** Dernier bloc d'un parcours à deux lignes : ajoute la colonne du total général. */
  grand: boolean
}

/** Au-delà de 9 trous la carte se lit sur deux lignes, aller puis retour, comme
 *  sur une carte papier : une seule rangée de 18 colonnes obligerait à défiler. */
function splitHalves(count: number): Half[] {
  if (count <= 9) return [{ label: '', from: 0, to: count, subtotal: 'Tot', grand: false }]
  return [
    { label: 'Aller', from: 0, to: 9, subtotal: 'Alr', grand: false },
    { label: 'Retour', from: 9, to: count, subtotal: 'Rtr', grand: true },
  ]
}

/** Trigrammes à la télévision : PIE, MAR… On allonge jusqu'à ce qu'ils soient
 *  distincts, sinon deux « Marc » et « Maria » se confondraient. */
function abbreviations(names: string[]): string[] {
  for (let length = 3; length <= 8; length++) {
    const codes = names.map((n) => n.trim().slice(0, length).toUpperCase() || '—')
    if (new Set(codes).size === codes.length) return codes
  }
  return names.map((n) => n.trim().toUpperCase())
}

export default function Scorecard() {
  const { id } = useParams()
  const round = useStore((s) => s.rounds.find((r) => r.id === id))
  const setScore = useStore((s) => s.setScore)

  if (!round) {
    return (
      <Screen title="Partie introuvable" back="/">
        <p className="text-veil/60">Cette partie a été supprimée.</p>
      </Screen>
    )
  }

  const holes = roundHoles(round)
  const halves = splitHalves(holes.length)

  return (
    <Screen
      title="Carte de score"
      subtitle={courseLabel(round.course)}
      back={`/round/${round.id}`}
      footer={
        <Link to={`/round/${round.id}/results`} className="btn-primary w-full">
          Résultats
        </Link>
      }
    >
      {halves.map((half) => (
        <div key={half.label || 'all'} className="card overflow-x-auto p-2">
          {half.label && (
            <div className="px-1 pb-1 font-display text-sm font-semibold uppercase tracking-wider text-accent-ink">
              {half.label}
            </div>
          )}
          <HalfTable round={round} holes={holes} half={half} setScore={setScore} />
        </div>
      ))}

      <p className="px-1 text-xs text-veil/40">
        Touche une case pour corriger un score. Laisse vide pour effacer, saisis 0 pour une
        balle ramassée. Cercle : sous le par — carré : au-dessus. Les totaux ignorent les trous
        non saisis.
      </p>
    </Screen>
  )
}

function HalfTable({
  round,
  holes,
  half,
  setScore,
}: {
  round: Round
  holes: Hole[]
  half: Half
  setScore: (roundId: string, playerId: string, holeIndex: number, value: number | null) => void
}) {
  const slice = holes.slice(half.from, half.to)
  const names = round.participants.map(
    ({ playerId }) => round.players.find((p) => p.id === playerId)?.name ?? '—',
  )
  const codes = abbreviations(names)

  const sum = (scores: (number | null)[], from: number, to: number) =>
    scores.slice(from, to).reduce<number>((acc, v) => acc + (v ?? 0), 0)

  const head = 'font-display text-xs font-semibold uppercase tracking-wider text-veil/45'

  return (
    <table className="w-full border-separate border-spacing-x-px border-spacing-y-1 text-sm">
      <thead>
        <tr>
          <th className={`${head} w-9 text-left`}>Trou</th>
          {slice.map((hole) => (
            <th key={hole.number} className={`${head} w-6 text-center tabular-nums`}>
              {hole.number}
            </th>
          ))}
          <th className={`${head} w-8 text-center text-accent-ink`}>{half.subtotal}</th>
          {half.grand && (
            <th className={`${head} w-8 text-center text-accent-ink`}>Tot</th>
          )}
        </tr>
      </thead>
      <tbody>
        <tr className="text-veil/55">
          <th className={`${head} text-left`}>Par</th>
          {slice.map((hole) => (
            <td key={hole.number} className="text-center text-xs tabular-nums">
              {hole.par}
            </td>
          ))}
          <td className="text-center text-xs font-semibold tabular-nums text-accent-ink">
            {totalPar(slice)}
          </td>
          {half.grand && (
            <td className="text-center text-xs font-semibold tabular-nums text-accent-ink">
              {totalPar(holes)}
            </td>
          )}
        </tr>
        <tr className="text-veil/40">
          <th className={`${head} text-left`}>SI</th>
          {slice.map((hole) => (
            <td key={hole.number} className="text-center text-[11px] tabular-nums">
              {hole.si}
            </td>
          ))}
          <td />
          {half.grand && <td />}
        </tr>

        {round.participants.map(({ playerId }, row) => {
          const scores = round.scores[playerId] ?? []
          return (
            <tr key={playerId}>
              <th
                title={names[row]}
                className="text-left font-display text-base font-bold uppercase tracking-wide"
              >
                {codes[row]}
              </th>
              {slice.map((hole, offset) => (
                <td key={hole.number} className="text-center">
                  <ScoreCell
                    value={scores[half.from + offset] ?? null}
                    par={hole.par}
                    onChange={(v) => setScore(round.id, playerId, half.from + offset, v)}
                  />
                </td>
              ))}
              <td className="text-center font-display text-lg font-bold tabular-nums text-accent-ink">
                {sum(scores, half.from, half.to) || ''}
              </td>
              {half.grand && (
                <td className="text-center font-display text-lg font-bold tabular-nums">
                  {sum(scores, 0, holes.length) || ''}
                </td>
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}


/** Case éditable. La forme autour du score dit où il se situe par rapport au par. */
function ScoreCell({
  value,
  par,
  onChange,
}: {
  value: number | null
  par: number
  onChange: (value: number | null) => void
}) {
  const toPar = value === null || value === PICKED_UP ? null : value - par
  const tone =
    toPar === null
      ? 'cell-empty'
      : toPar <= -2
        ? 'cell-eagle'
        : toPar === -1
          ? 'cell-birdie'
          : toPar === 0
            ? 'cell-par'
            : toPar === 1
              ? 'cell-bogey'
              : 'cell-worse'

  return (
    <input
      className={`cell ${tone}`}
      type="number"
      inputMode="numeric"
      min={0}
      max={20}
      value={value ?? ''}
      placeholder="–"
      onChange={(e) => {
        const raw = e.target.value
        if (raw === '') return onChange(null)
        const parsed = Number(raw)
        if (Number.isNaN(parsed)) return
        onChange(Math.max(0, Math.min(20, parsed)))
      }}
    />
  )
}
