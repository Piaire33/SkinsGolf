import { roundHoles, totalPar } from './handicap'
import { formatToPar, rank } from './strokeplay'
import { sideScores, sidesOf, type Side } from './teams'
import type { LeaderboardRow, Round } from './types'

export interface ScrambleLine {
  side: Side
  /** Meilleur score de l'équipe par trou. */
  perHole: (number | null)[]
  total: number
  holesPlayed: number
  toPar: number
}

export interface ScrambleResult {
  lines: ScrambleLine[]
  leaderboard: LeaderboardRow[]
}

/**
 * Scramble et best-ball : l'équipe retient son meilleur score sur chaque trou.
 * En net, chaque joueur bénéficie de ses propres coups rendus avant comparaison.
 */
export function computeScramble(round: Round): ScrambleResult {
  const holes = roundHoles(round)
  const sides = sidesOf(round)

  const lines: ScrambleLine[] = sides.map((side) => {
    const perHole = sideScores(round, side, round.net)
    let total = 0
    let holesPlayed = 0
    let parPlayed = 0
    perHole.forEach((score, i) => {
      if (score === null) return
      total += score
      parPlayed += holes[i].par
      holesPlayed++
    })
    return { side, perHole, total, holesPlayed, toPar: total - parPlayed }
  })

  const leaderboard = rank(
    lines.map((line) => ({
      key: line.side.id,
      label: line.side.label,
      sortValue: line.toPar,
      display: formatToPar(line.toPar),
      toPar: line.toPar,
      secondary: `${line.total} coups`,
      holesPlayed: line.holesPlayed,
      rank: 0,
    })),
  )

  return { lines, leaderboard }
}

export function coursePar(round: Round): number {
  return totalPar(roundHoles(round))
}
