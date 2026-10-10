import { playingHandicaps, roundHoles, strokesReceived } from './handicap'
import { PICKED_UP } from './skins'
import { formatHcp, nameOf, rank } from './strokeplay'
import type { LeaderboardRow, Round } from './types'

export interface StablefordLine {
  playerId: string
  playingHcp: number
  points: (number | null)[]
  total: number
  holesPlayed: number
}

export interface StablefordResult {
  lines: StablefordLine[]
  leaderboard: LeaderboardRow[]
}

/**
 * Points Stableford d'un trou : 2 points pour le par net, +1 par coup en
 * dessous, −1 par coup au-dessus, jamais moins de 0. Un double bogey net ou
 * pire (et une balle ramassée) ne rapporte donc rien.
 */
export function stablefordPoints(par: number, given: number, gross: number): number {
  if (gross === PICKED_UP) return 0
  return Math.max(0, 2 + par + given - gross)
}

export function computeStableford(round: Round): StablefordResult {
  const holes = roundHoles(round)
  const holeCount = holes.length
  const hcps = playingHandicaps(round)

  const lines: StablefordLine[] = round.participants.map(({ playerId }) => {
    const ph = hcps[playerId] ?? 0
    let total = 0
    let holesPlayed = 0
    const points = holes.map((hole, i) => {
      const gross = round.scores[playerId]?.[i] ?? null
      if (gross === null) return null
      const given = round.net ? strokesReceived(ph, hole.si, holeCount) : 0
      const pts = stablefordPoints(hole.par, given, gross)
      total += pts
      holesPlayed++
      return pts
    })
    return { playerId, playingHcp: ph, points, total, holesPlayed }
  })

  // Au Stableford le meilleur score est le PLUS GRAND : on trie sur l'opposé
  // pour réutiliser le classement commun (« plus petit = meilleur »).
  const leaderboard: LeaderboardRow[] = rank(
    lines.map((line) => ({
      key: line.playerId,
      label: nameOf(round, line.playerId),
      sortValue: -line.total,
      display: `${line.total} pts`,
      secondary: round.net ? `hcp ${formatHcp(line.playingHcp)}` : 'brut',
      holesPlayed: line.holesPlayed,
      rank: 0,
    })),
  )

  return { lines, leaderboard }
}
