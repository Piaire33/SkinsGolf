import { useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Screen, euro } from '@/components/ui'
import { ChevronLeft, ChevronRight, GridIcon, TrophyIcon } from '@/components/icons'
import { useStore } from '@/store/useStore'
import { roundHoles, strokesReceived } from '@/domain/handicap'
import { playingHandicaps } from '@/domain/handicap'
import { computeSkins, PICKED_UP } from '@/domain/skins'
import { stablefordPoints } from '@/domain/stableford'
import { mainLeaderboard } from '@/domain'
import { formatHcp } from '@/domain/strokeplay'
import { FORMAT_LABELS } from '@/domain/types'
import { Leaderboard } from '@/components/Leaderboard'

export default function Scoring() {
  const { id } = useParams()
  const navigate = useNavigate()
  const round = useStore((s) => s.rounds.find((r) => r.id === id))
  const setScore = useStore((s) => s.setScore)
  const bumpScore = useStore((s) => s.bumpScore)
  const setCurrentHole = useStore((s) => s.setCurrentHole)

  const touchStart = useRef<{ x: number; y: number } | null>(null)

  if (!round) {
    return (
      <Screen title="Partie introuvable" back="/">
        <p className="text-veil/60">Cette partie a été supprimée.</p>
      </Screen>
    )
  }

  const holes = roundHoles(round)
  const holeIndex = Math.min(Math.max(round.currentHole, 1), holes.length) - 1
  const hole = holes[holeIndex]
  const hcps = playingHandicaps(round)
  const skins = round.skins.enabled ? computeSkins(round) : null
  const skinsHole = skins?.holes[holeIndex]
  const leaderboard = mainLeaderboard(round)

  const isLastHole = holeIndex === holes.length - 1
  const allEnteredOnHole = round.participants.every(
    ({ playerId }) => (round.scores[playerId]?.[holeIndex] ?? null) !== null,
  )

  function go(delta: number) {
    const next = holeIndex + 1 + delta
    if (next < 1 || next > holes.length) return
    setCurrentHole(round!.id, next)
  }

  return (
    <Screen
      title={`Trou ${hole.number}`}
      subtitle={`Par ${hole.par} · SI ${hole.si}${hole.meters ? ` · ${hole.meters} m` : ''}`}
      back="/"
      action={
        <div className="flex gap-1">
          <Link
            to={`/round/${round.id}/card`}
            className="p-2 rounded-lg text-white/75 hover:text-white hover:bg-white/10"
            aria-label="Carte de score"
          >
            <GridIcon />
          </Link>
          <Link
            to={`/round/${round.id}/results`}
            className="p-2 rounded-lg text-white/75 hover:text-white hover:bg-white/10"
            aria-label="Résultats"
          >
            <TrophyIcon />
          </Link>
        </div>
      }
      footer={
        <div className="flex items-center gap-2">
          <button
            onClick={() => go(-1)}
            disabled={holeIndex === 0}
            className="btn-ghost px-4"
            aria-label="Trou précédent"
          >
            <ChevronLeft />
          </button>
          {isLastHole ? (
            <Link to={`/round/${round.id}/results`} className="btn-primary flex-1">
              <TrophyIcon /> Voir les résultats
            </Link>
          ) : (
            <button
              onClick={() => go(1)}
              className={`flex-1 ${allEnteredOnHole ? 'btn-primary' : 'btn-ghost'}`}
            >
              Trou {hole.number + 1} <ChevronRight />
            </button>
          )}
          <button
            onClick={() => go(1)}
            disabled={isLastHole}
            className="btn-ghost px-4"
            aria-label="Trou suivant"
          >
            <ChevronRight />
          </button>
        </div>
      }
    >
      <div
        onTouchStart={(e) => {
          touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        }}
        onTouchEnd={(e) => {
          const start = touchStart.current
          touchStart.current = null
          if (!start) return
          const dx = e.changedTouches[0].clientX - start.x
          const dy = e.changedTouches[0].clientY - start.y
          // Un glissement franchement horizontal change de trou ; on ignore le
          // scroll vertical et les petits mouvements de pouce.
          if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
          go(dx < 0 ? 1 : -1)
        }}
        className="space-y-3"
      >
        <HoleStrip
          count={holes.length}
          current={holeIndex}
          completed={holes.map((_, i) =>
            round.participants.every(({ playerId }) => (round.scores[playerId]?.[i] ?? null) !== null),
          )}
          onSelect={(i) => setCurrentHole(round.id, i + 1)}
        />

        {skinsHole && (
          <div className="rounded-2xl bg-warn-soft border border-warn-line px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-warn-ink/80">
                Valeur de ce trou
              </div>
              {skinsHole.carriedIn > 0 && (
                <div className="text-xs text-warn-ink/70">
                  {euro(skinsHole.value)} + {euro(skinsHole.carriedIn)} de report
                </div>
              )}
            </div>
            <div className="text-2xl font-bold text-warn-ink tabular-nums">
              {euro(skinsHole.inPlay)}
            </div>
          </div>
        )}

        <div className="space-y-2.5">
          {round.participants.map(({ playerId, teamId }) => {
            const player = round.players.find((p) => p.id === playerId)
            const value = round.scores[playerId]?.[holeIndex] ?? null
            const given = strokesReceived(hcps[playerId] ?? 0, hole.si, holes.length)
            const isSkinsWinner = skinsHole?.winnerIds.includes(playerId) ?? false
            return (
              <PlayerScoreRow
                key={playerId}
                name={player?.name ?? '—'}
                teamId={teamId}
                playingHcp={hcps[playerId] ?? 0}
                given={given}
                par={hole.par}
                value={value}
                highlight={isSkinsWinner}
                onChange={(next) => setScore(round.id, playerId, holeIndex, next)}
                onBump={(delta) => bumpScore(round.id, playerId, holeIndex, delta, hole.par)}
              />
            )
          })}
        </div>

        {/* Classement vivant : l'intérêt de l'app est de savoir où on en est
            sans attendre la fin de la partie. */}
        <div className="card space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="label mb-0">{FORMAT_LABELS[round.format]}</span>
            <span className="text-xs text-veil/40">{round.net ? 'net' : 'brut'}</span>
          </div>
          <Leaderboard rows={leaderboard} holeCount={holes.length} compact />
        </div>

        {skins && (
          <div className="card space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="label mb-0">Skins · solde en cours</span>
              <span className="text-xs text-veil/40">{round.skins.net ? 'net' : 'brut'}</span>
            </div>
            {round.participants.map(({ playerId }) => {
              const player = round.players.find((p) => p.id === playerId)
              const net = skins.net[playerId] ?? 0
              return (
                <div key={playerId} className="flex items-center gap-3 text-sm">
                  <span className="flex-1 truncate">{player?.name}</span>
                  <span className="text-veil/40 text-xs">
                    {skins.skinsWon[playerId] ?? 0} trou{(skins.skinsWon[playerId] ?? 0) > 1 ? 's' : ''}
                  </span>
                  <span
                    className={`font-semibold tabular-nums w-20 text-right ${
                      net > 0 ? 'text-accent-ink' : net < 0 ? 'text-danger-ink' : 'text-veil/40'
                    }`}
                  >
                    {net > 0 ? '+' : ''}
                    {euro(net)}
                  </span>
                </div>
              )
            })}
            {skins.unresolvedPot > 0 && (
              <p className="text-xs text-warn-ink/80 pt-1">
                {euro(skins.unresolvedPot)} encore en jeu (report non attribué).
              </p>
            )}
          </div>
        )}

        <button
          onClick={() => {
            if (!confirm('Terminer la partie ? Tu pourras la rouvrir depuis l\'historique.')) return
            useStore.getState().finishRound(round.id)
            navigate(`/round/${round.id}/results`)
          }}
          className="btn-ghost w-full text-sm"
        >
          Terminer la partie
        </button>

        <p className="text-center text-xs text-veil/25 pb-2">
          Glisse horizontalement pour changer de trou
        </p>
      </div>
    </Screen>
  )
}

/** Bande de pastilles donnant l'avancement et permettant de sauter à un trou. */
function HoleStrip({
  count,
  current,
  completed,
  onSelect,
}: {
  count: number
  current: number
  completed: boolean[]
  onSelect: (index: number) => void
}) {
  return (
    <div className="flex gap-1 overflow-x-auto -mx-1 px-1 pb-1">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={`shrink-0 w-8 h-8 rounded-lg text-xs font-semibold tabular-nums border ${
            i === current
              ? 'bg-accent border-accent text-white'
              : completed[i]
                ? 'bg-accent-soft border-accent-line text-accent-strong'
                : 'bg-elevated border-veil/10 text-veil/40'
          }`}
        >
          {i + 1}
        </button>
      ))}
    </div>
  )
}

/** Forme dessinée autour du score : cercle sous le par, carré au-dessus. */
function markFor(toPar: number | null): string {
  if (toPar === null || toPar === 0) return ''
  if (toPar <= -2) return 'mark-eagle'
  if (toPar === -1) return 'mark-birdie'
  return toPar === 1 ? 'mark-bogey' : 'mark-worse'
}

const SCORE_NAMES: Record<number, string> = {
  [-3]: 'albatros',
  [-2]: 'eagle',
  [-1]: 'birdie',
  0: 'par',
  1: 'bogey',
  2: 'double',
  3: 'triple',
}

function PlayerScoreRow({
  name,
  teamId,
  playingHcp,
  given,
  par,
  value,
  highlight,
  onChange,
  onBump,
}: {
  name: string
  teamId?: string
  playingHcp: number
  given: number
  par: number
  value: number | null
  highlight: boolean
  onChange: (value: number | null) => void
  /** Incrément relatif : résolu dans le store pour encaisser les appuis rapides. */
  onBump: (delta: number) => void
}) {
  const pickedUp = value === PICKED_UP
  const toPar = value !== null && !pickedUp ? value - par : null
  const label = toPar !== null ? (SCORE_NAMES[toPar] ?? (toPar > 0 ? `+${toPar}` : String(toPar))) : null

  return (
    <div
      className={`card py-3 ${highlight ? 'border-warn-line bg-warn-soft' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0 flex items-center gap-2">
          <span className="font-semibold truncate">{name}</span>
          {teamId && (
            <span className="shrink-0 text-[10px] font-bold bg-veil/10 rounded px-1.5 py-0.5">
              {teamId}
            </span>
          )}
        </div>
        <div className="text-xs text-veil/40 tabular-nums shrink-0">
          hcp {formatHcp(playingHcp)}
          {given !== 0 && (
            <span className="ml-1.5 text-accent-ink font-semibold">
              {given > 0 ? `+${given}` : given} coup{Math.abs(given) > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => onBump(-1)}
          className="w-14 h-14 rounded-lg bg-veil/10 text-2xl font-bold active:scale-95 transition"
          aria-label="Un coup de moins"
        >
          −
        </button>

        <div className="flex-1 text-center">
          {pickedUp ? (
            <div className="text-2xl font-bold text-veil/40">ramassée</div>
          ) : (
            <div
              className={`mark mx-auto grid h-14 w-14 place-items-center text-5xl font-bold leading-none ${markFor(toPar)}`}
            >
              {value ?? <span className="text-veil/20">{par}</span>}
            </div>
          )}
          <div className="mt-2 h-4 text-xs text-veil/45">
            {label}
            {value !== null && !pickedUp && (
              <>
                {' · '}
                <span className="text-accent-ink">
                  {stablefordPoints(par, given, value)} pt
                  {stablefordPoints(par, given, value) > 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
        </div>

        <button
          onClick={() => onBump(1)}
          className="w-14 h-14 rounded-lg bg-accent text-2xl font-bold text-white active:scale-95 transition"
          aria-label="Un coup de plus"
        >
          +
        </button>
      </div>

      <div className="flex gap-2 mt-2">
        <button
          onClick={() => onChange(pickedUp ? null : PICKED_UP)}
          className={`flex-1 rounded-lg py-1.5 text-xs font-medium ${
            pickedUp ? 'bg-veil/15 text-content' : 'bg-veil/5 text-veil/50'
          }`}
        >
          Balle ramassée
        </button>
        {value !== null && (
          <button
            onClick={() => onChange(null)}
            className="flex-1 rounded-lg py-1.5 text-xs font-medium bg-veil/5 text-veil/50"
          >
            Effacer
          </button>
        )}
      </div>
    </div>
  )
}
