import { Link, useParams } from 'react-router-dom'
import { Screen, euro, formatDate } from '@/components/ui'
import { GridIcon } from '@/components/icons'
import { useStore } from '@/store/useStore'
import { courseLabel } from '@/domain/course'
import { roundHoles, roundTee } from '@/domain/handicap'
import { computeMatchplay } from '@/domain/matchplay'
import { computeSkins, type SkinsResult } from '@/domain/skins'
import { computeStableford } from '@/domain/stableford'
import { computeStrokeplay, nameOf } from '@/domain/strokeplay'
import { computeScramble } from '@/domain/scramble'
import { mainLeaderboard } from '@/domain'
import { Leaderboard } from '@/components/Leaderboard'
import { FORMAT_LABELS, type Round } from '@/domain/types'

export default function Results() {
  const { id } = useParams()
  const round = useStore((s) => s.rounds.find((r) => r.id === id))
  const finishRound = useStore((s) => s.finishRound)

  if (!round) {
    return (
      <Screen title="Partie introuvable" back="/">
        <p className="text-veil/60">Cette partie a été supprimée.</p>
      </Screen>
    )
  }

  const skins = round.skins.enabled ? computeSkins(round) : null
  const matchplay = round.format === 'matchplay' ? computeMatchplay(round) : null
  const holes = roundHoles(round)
  const played = holes.filter((_, i) =>
    round.participants.every(({ playerId }) => (round.scores[playerId]?.[i] ?? null) !== null),
  ).length

  // Déclaration fléchée et non `function` : TypeScript ne conserve pas le
  // rétrécissement de `round` à l'intérieur d'une fonction hoistée.
  const share = async () => {
    const text = buildShareText(round, skins)
    try {
      if (navigator.share) await navigator.share({ title: 'SkinsGolf', text })
      else {
        await navigator.clipboard.writeText(text)
        alert('Résultats copiés dans le presse-papier.')
      }
    } catch {
      /* partage annulé par l'utilisateur */
    }
  }


  return (
    <Screen
      title="Résultats"
      subtitle={`${courseLabel(round.course)} · ${formatDate(round.date)}`}
      back={`/round/${round.id}`}
      action={
        <Link
          to={`/round/${round.id}/card`}
          className="p-2 rounded-lg text-white/75 hover:text-white hover:bg-white/10"
          aria-label="Carte de score"
        >
          <GridIcon />
        </Link>
      }
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button onClick={share} className="btn-ghost">
            Partager
          </button>
          {round.status === 'inProgress' ? (
            <button onClick={() => finishRound(round.id)} className="btn-primary">
              Clôturer
            </button>
          ) : (
            <Link to="/" className="btn-primary">
              Accueil
            </Link>
          )}
        </div>
      }
    >
      <div className="text-xs text-veil/40 px-1">
        {played}/{holes.length} trous complets · série {roundTee(round).name} ·{' '}
        {round.net ? `net ${Math.round(round.hcpAllowance * 100)} %` : 'brut'}
        {round.status === 'inProgress' && ' · partie en cours'}
      </div>

      {/* ---------- Formule principale ---------- */}
      <section className="card space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="label mb-0">{FORMAT_LABELS[round.format]}</span>
        </div>

        {matchplay && (
          <div
            className={`rounded-lg px-3 py-2.5 text-center font-display text-xl font-semibold uppercase tracking-wide ${
              matchplay.invalid ? 'bg-warn-soft text-warn-ink' : 'bg-bar text-white'
            }`}
          >
            {matchplay.resultText}
          </div>
        )}

        <Leaderboard rows={mainLeaderboard(round)} holeCount={holes.length} />

        <FormatDetail round={round} />
      </section>

      {/* ---------- Skins ---------- */}
      {skins && <SkinsSection round={round} skins={skins} />}
    </Screen>
  )
}

/** Tableau détaillé propre à la formule jouée. */
function FormatDetail({ round }: { round: Round }) {
  const holes = roundHoles(round)

  if (round.format === 'stableford') {
    const { lines } = computeStableford(round)
    return (
      <HoleTable
        holes={holes.map((h) => h.number)}
        rows={lines.map((line) => ({
          label: nameOf(round, line.playerId),
          cells: line.points.map((p) => (p === null ? '' : String(p))),
          total: String(line.total),
        }))}
        totalLabel="pts"
      />
    )
  }

  if (round.format === 'strokeplay') {
    const { lines } = computeStrokeplay(round)
    return (
      <HoleTable
        holes={holes.map((h) => h.number)}
        rows={lines.map((line) => ({
          label: nameOf(round, line.playerId),
          cells: (round.net ? line.net : line.counted).map((v) => (v === null ? '' : String(v))),
          total: String(round.net ? line.netTotal : line.grossTotal),
        }))}
        totalLabel={round.net ? 'net' : 'brut'}
      />
    )
  }

  if (round.format === 'scramble') {
    const { lines } = computeScramble(round)
    return (
      <HoleTable
        holes={holes.map((h) => h.number)}
        rows={lines.map((line) => ({
          label: line.side.label,
          cells: line.perHole.map((v) => (v === null ? '' : String(v))),
          total: String(line.total),
        }))}
        totalLabel="total"
      />
    )
  }

  const match = computeMatchplay(round)
  if (match.invalid) return null
  return (
    <HoleTable
      holes={holes.map((h) => h.number)}
      rows={[
        {
          label: 'Match',
          cells: match.holes.map((h) =>
            !h.played ? '' : h.state === 0 ? 'AS' : h.state > 0 ? `+${h.state}` : String(h.state),
          ),
          total: match.lead === 0 ? 'AS' : `${Math.abs(match.lead)}`,
        },
      ]}
      totalLabel={match.sides[0]?.label ?? ''}
    />
  )
}

function HoleTable({
  holes,
  rows,
  totalLabel,
}: {
  holes: number[]
  rows: { label: string; cells: string[]; total: string }[]
  totalLabel: string
}) {
  // Deux lignes au-delà de 9 trous, comme la carte de score : aller puis retour.
  const blocks: [number, number][] =
    holes.length > 9
      ? [
          [0, 9],
          [9, holes.length],
        ]
      : [[0, holes.length]]

  return (
    <div className="space-y-1 border-t border-veil/5 pt-2">
      {blocks.map(([from, to], index) => (
        <div key={from} className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-x-px border-spacing-y-0.5 text-sm">
            <thead>
              <tr className="font-display text-xs font-semibold uppercase tracking-wider text-veil/40">
                <th className="w-12 text-left" />
                {holes.slice(from, to).map((h) => (
                  <th key={h} className="w-6 text-center tabular-nums">
                    {h}
                  </th>
                ))}
                <th className="pl-1 text-right text-accent-ink">
                  {index === blocks.length - 1 ? totalLabel : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th className="max-w-[3rem] truncate text-left font-display text-sm font-bold uppercase tracking-wide">
                    {row.label}
                  </th>
                  {row.cells.slice(from, to).map((cell, i) => (
                    <td key={i} className="text-center tabular-nums text-veil/75">
                      {cell || '·'}
                    </td>
                  ))}
                  <td className="pl-1 text-right font-display text-lg font-bold tabular-nums text-accent-ink">
                    {index === blocks.length - 1 ? row.total : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

function SkinsSection({ round, skins }: { round: Round; skins: SkinsResult }) {
  return (
    <section className="card space-y-4">
      <div className="flex items-baseline justify-between">
        <span className="label mb-0">Skins game</span>
        <span className="text-xs text-veil/40">
          {round.skins.net ? 'net' : 'brut'} ·{' '}
          {round.skins.tieRule === 'carryOver'
            ? 'report cumulé'
            : round.skins.tieRule === 'split'
              ? 'partage'
              : 'trou annulé'}
        </span>
      </div>

      {/* Bilan par joueur */}
      <div className="space-y-1.5">
        {round.participants.map(({ playerId }) => {
          const net = skins.net[playerId] ?? 0
          return (
            <div key={playerId} className="flex items-center gap-3">
              <span className="flex-1 min-w-0">
                <span className="block font-medium truncate">{nameOf(round, playerId)}</span>
                <span className="block text-xs text-veil/40 tabular-nums">
                  {skins.skinsWon[playerId] ?? 0} trou{(skins.skinsWon[playerId] ?? 0) > 1 ? 's' : ''} ·{' '}
                  encaissé {euro(skins.gains[playerId] ?? 0)} · payé {euro(skins.paid[playerId] ?? 0)}
                </span>
              </span>
              <span
                className={`font-bold tabular-nums text-lg ${
                  net > 0 ? 'text-accent-ink' : net < 0 ? 'text-danger-ink' : 'text-veil/40'
                }`}
              >
                {net > 0 ? '+' : ''}
                {euro(net)}
              </span>
            </div>
          )
        })}
      </div>

      <div className="text-xs text-veil/40 tabular-nums">
        {skins.unresolvedPot > 0 && (
          <span className="block text-warn-ink/80 mt-1">
            {euro(skins.unresolvedPot)} de report n'ont pas trouvé de gagnant (égalités
            jusqu'au dernier trou) : rien n'est dû, à rejouer en playoff si vous voulez le
            mettre en jeu.
          </span>
        )}
      </div>

      {/* Règlement */}
      {skins.settlement.length > 0 && (
        <div className="rounded-xl bg-accent-soft/40 border border-accent-line p-3 space-y-2">
          <div className="font-display text-sm font-semibold uppercase tracking-wider text-accent-ink">
            {round.status === 'finished' ? 'Règlement' : 'Solde provisoire'}
          </div>
          {skins.settlement.map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="font-medium truncate">{nameOf(round, t.from)}</span>
              <span className="text-veil/30">→</span>
              <span className="font-medium truncate flex-1">{nameOf(round, t.to)}</span>
              <span className="font-bold tabular-nums">{euro(t.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Détail trou par trou */}
      <div className="border-t border-veil/5 pt-3 space-y-1">
        <div className="text-xs font-medium uppercase tracking-wide text-veil/40 mb-1.5">
          Trou par trou
        </div>
        {skins.holes.map((h) => (
          <div key={h.hole} className="flex items-center gap-2 text-sm py-0.5">
            <span className="w-6 text-veil/40 tabular-nums text-xs">{h.hole}</span>
            <span className="w-10 text-veil/30 text-xs">par {h.par}</span>
            <span className="flex-1 min-w-0 truncate">
              {h.status === 'won' && (
                <span className="text-accent-strong font-medium">
                  {nameOf(round, h.winnerIds[0])}
                  {h.bestScore !== null && (
                    <span className="text-veil/40 font-normal"> ({h.bestScore})</span>
                  )}
                </span>
              )}
              {h.status === 'split' && (
                <span className="text-accent-strong">
                  partagé : {h.winnerIds.map((w) => nameOf(round, w)).join(', ')}
                </span>
              )}
              {h.status === 'carried' && <span className="text-warn-ink/80">égalité — report</span>}
              {h.status === 'void' && <span className="text-veil/30">égalité — annulé</span>}
              {h.status === 'pending' && <span className="text-veil/25">non saisi</span>}
            </span>
            {h.carriedIn > 0 && (
              <span className="text-[11px] text-warn-ink/60 tabular-nums shrink-0">
                +{euro(h.carriedIn)}
              </span>
            )}
            <span
              className={`tabular-nums font-semibold w-16 text-right shrink-0 ${
                h.status === 'won' || h.status === 'split' ? 'text-accent-strong' : 'text-veil/30'
              }`}
            >
              {euro(h.inPlay)}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

function buildShareText(round: Round, skins: SkinsResult | null): string {
  const lines: string[] = [
    `⛳ ${courseLabel(round.course)} — ${formatDate(round.date)}`,
    `${FORMAT_LABELS[round.format]} ${round.net ? 'net' : 'brut'}`,
    '',
  ]
  for (const row of mainLeaderboard(round)) {
    lines.push(`${row.rank}. ${row.label} — ${row.display}`)
  }
  if (skins) {
    lines.push('', `💰 Skins (${round.skins.net ? 'net' : 'brut'})`)
    for (const { playerId } of round.participants) {
      const net = skins.net[playerId] ?? 0
      lines.push(
        `${nameOf(round, playerId)} : ${net > 0 ? '+' : ''}${euro(net)} (${skins.skinsWon[playerId] ?? 0} trous)`,
      )
    }
    if (skins.settlement.length > 0) {
      lines.push('', round.status === 'finished' ? 'Règlement :' : 'Solde provisoire :')
      for (const t of skins.settlement) {
        lines.push(`${nameOf(round, t.from)} → ${nameOf(round, t.to)} : ${euro(t.amount)}`)
      }
    }
    if (skins.unresolvedPot > 0) {
      lines.push('', `Report non attribué : ${euro(skins.unresolvedPot)}`)
    }
  }
  return lines.join('\n')
}
