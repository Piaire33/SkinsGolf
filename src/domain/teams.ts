import { playingHandicaps, roundHoles, strokesReceived } from './handicap'
import { PICKED_UP } from './skins'
import { nameOf } from './strokeplay'
import type { Round } from './types'

export interface Side {
  id: string
  label: string
  playerIds: string[]
}

/**
 * Les camps en présence : les équipes déclarées dans la partie, ou un camp par
 * joueur si aucune équipe n'a été formée (match play en simple).
 */
export function sidesOf(round: Round): Side[] {
  const hasTeams = round.participants.some((p) => p.teamId)
  if (!hasTeams) {
    return round.participants.map((p) => ({
      id: p.playerId,
      label: nameOf(round, p.playerId),
      playerIds: [p.playerId],
    }))
  }
  const byTeam = new Map<string, string[]>()
  for (const p of round.participants) {
    const key = p.teamId ?? p.playerId
    byTeam.set(key, [...(byTeam.get(key) ?? []), p.playerId])
  }
  return [...byTeam.entries()].map(([id, playerIds]) => ({
    id,
    label: playerIds.map((pid) => nameOf(round, pid)).join(' & '),
    playerIds,
  }))
}

/**
 * Meilleur score d'un camp sur chaque trou (best-ball).
 *
 * `null` quand aucun membre n'a de score exploitable : soit rien n'est encore
 * saisi, soit tout le monde a ramassé. En scramble l'équipe ne rentre qu'un
 * score, saisi à l'identique pour ses membres — le minimum donne donc le même
 * résultat, ce qui permet de partager le code.
 */
export function sideScores(round: Round, side: Side, net: boolean): (number | null)[] {
  const holes = roundHoles(round)
  const holeCount = holes.length
  const hcps = playingHandicaps(round)

  return holes.map((hole, i) => {
    let best: number | null = null
    for (const playerId of side.playerIds) {
      const gross = round.scores[playerId]?.[i] ?? null
      if (gross === null || gross === PICKED_UP) continue
      const given = net ? strokesReceived(hcps[playerId] ?? 0, hole.si, holeCount) : 0
      const score = gross - given
      if (best === null || score < best) best = score
    }
    return best
  })
}

/** Vrai quand au moins un joueur du camp a une saisie sur le trou. */
export function sideHasEntry(round: Round, side: Side, holeIndex: number): boolean {
  return side.playerIds.some((pid) => (round.scores[pid]?.[holeIndex] ?? null) !== null)
}
