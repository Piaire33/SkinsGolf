import { Link } from 'react-router-dom'
import { Screen, Tile, euro, formatDate } from '@/components/ui'
import {
  CogIcon,
  FlagIcon,
  HistoryIcon,
  MapIcon,
  PlayIcon,
  UsersIcon,
} from '@/components/icons'
import { useActiveRound, useStore } from '@/store/useStore'
import { computeSkins } from '@/domain/skins'
import { courseLabel } from '@/domain/course'
import { FORMAT_LABELS } from '@/domain/types'

export default function Home() {
  const active = useActiveRound()
  const courses = useStore((s) => s.courses)
  const players = useStore((s) => s.players)
  const rounds = useStore((s) => s.rounds)

  return (
    <Screen
      title="SkinsGolf"
      subtitle="Cartes de score et skins game"
      action={
        <Link to="/settings" className="p-2 rounded-lg text-white/75 hover:text-white hover:bg-white/10">
          <CogIcon />
        </Link>
      }
    >
      {active && (
        <Link
          to={`/round/${active.id}`}
          // Cette carte reste bleu marine dans les deux thèmes : son contenu est
          // donc figé en blanc plutôt que d'utiliser les jetons sémantiques.
          className="block rounded-xl bg-bar p-4 border border-white/20 text-white"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wide text-white/70">Partie en cours</div>
              <div className="font-display text-xl font-bold uppercase tracking-wide truncate">{courseLabel(active.course)}</div>
              <div className="text-sm text-white/80">
                Trou {active.currentHole} · {FORMAT_LABELS[active.format]}
                {active.skins.enabled && ' + skins'} · {formatDate(active.date)}
              </div>
              {active.skins.enabled && <SkinsBadge roundId={active.id} />}
            </div>
            <div className="shrink-0 w-11 h-11 rounded-full bg-white/15 grid place-items-center">
              <PlayIcon />
            </div>
          </div>
        </Link>
      )}

      <Link to="/new" className="btn-primary w-full text-base py-4">
        <FlagIcon /> Nouvelle partie
      </Link>

      <div className="space-y-2.5">
        <Tile
          to="/courses"
          title="Parcours"
          description={`${courses.length} enregistré${courses.length > 1 ? 's' : ''} · éditer ou importer`}
          icon={<MapIcon />}
        />
        <Tile
          to="/players"
          title="Joueurs"
          description={
            players.length === 0
              ? 'Aucun joueur — commence par en ajouter'
              : `${players.length} joueur${players.length > 1 ? 's' : ''} dans le carnet`
          }
          icon={<UsersIcon />}
        />
        <Tile
          to="/history"
          title="Historique"
          description={
            rounds.length === 0 ? 'Aucune partie jouée' : `${rounds.length} partie${rounds.length > 1 ? 's' : ''}`
          }
          icon={<HistoryIcon />}
        />
      </div>

      <p className="pt-4 text-center text-[11px] text-veil/30">
        SkinsGolf · version {__APP_VERSION__}
      </p>
    </Screen>
  )
}

/** Montant en jeu sur le trou courant, pour donner l'info sans ouvrir la partie. */
function SkinsBadge({ roundId }: { roundId: string }) {
  const round = useStore((s) => s.rounds.find((r) => r.id === roundId))
  if (!round) return null
  const skins = computeSkins(round)
  const current = skins.holes[round.currentHole - 1]
  if (!current) return null
  return (
    <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-black/25 px-2 py-1 text-xs">
      <span className="text-white/70">Valeur du trou</span>
      <span className="font-semibold">{euro(current.inPlay)}</span>
      {current.carriedIn > 0 && (
        <span className="text-amber-300">dont {euro(current.carriedIn)} de report</span>
      )}
    </div>
  )
}
