import { Link } from 'react-router-dom'
import { EmptyState, Screen, euro, formatDate } from '@/components/ui'
import { TrashIcon } from '@/components/icons'
import { useStore } from '@/store/useStore'
import { courseLabel } from '@/domain/course'
import { computeSkins } from '@/domain/skins'
import { mainLeaderboard } from '@/domain'
import { FORMAT_LABELS, type Round } from '@/domain/types'

export default function History() {
  const rounds = useStore((s) => s.rounds)
  const deleteRound = useStore((s) => s.deleteRound)

  return (
    <Screen title="Historique" subtitle={`${rounds.length} partie${rounds.length > 1 ? 's' : ''}`} back="/">
      {rounds.length === 0 ? (
        <EmptyState title="Aucune partie" hint="Les parties jouées s'empileront ici." />
      ) : (
        <div className="space-y-2.5">
          {rounds.map((round) => (
            <div key={round.id} className="card flex items-start gap-3">
              <Link to={`/round/${round.id}/results`} className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{courseLabel(round.course)}</span>
                  {round.status === 'inProgress' && (
                    <span className="shrink-0 text-[10px] uppercase tracking-wide bg-accent rounded px-1.5 py-0.5">
                      en cours
                    </span>
                  )}
                </div>
                <div className="text-xs text-veil/40">
                  {formatDate(round.date)} · {FORMAT_LABELS[round.format]}
                  {round.skins.enabled && ' + skins'} · {round.participants.length} joueur
                  {round.participants.length > 1 ? 's' : ''}
                </div>
                <Summary round={round} />
              </Link>
              <button
                onClick={() => {
                  if (confirm('Supprimer cette partie définitivement ?')) deleteRound(round.id)
                }}
                className="p-2 rounded-lg text-danger-ink/60 hover:bg-veil/10 shrink-0"
                aria-label="Supprimer la partie"
              >
                <TrashIcon className="w-[18px] h-[18px]" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Screen>
  )
}

function Summary({ round }: { round: Round }) {
  const leader = mainLeaderboard(round).find((r) => r.holesPlayed > 0)
  const skins = round.skins.enabled ? computeSkins(round) : null
  const best = skins
    ? round.participants
        .map(({ playerId }) => ({ playerId, net: skins.net[playerId] ?? 0 }))
        .sort((a, b) => b.net - a.net)[0]
    : null

  return (
    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
      {leader && (
        <span>
          <span className="text-veil/40">1er </span>
          <span className="font-medium">{leader.label}</span>
          <span className="text-veil/40"> · {leader.display}</span>
        </span>
      )}
      {best && best.net > 0 && (
        <span className="text-accent-ink">
          💰 {round.players.find((p) => p.id === best.playerId)?.name} +{euro(best.net)}
        </span>
      )}
    </div>
  )
}
