import type { Hole, HoleCount, Round, Tee } from './types'

export function totalPar(holes: Hole[]): number {
  return holes.reduce((sum, h) => sum + h.par, 0)
}

/**
 * Handicap de jeu sur la série de départ choisie.
 *
 * Formule WHS : CH = Index × (Slope / 113) + (Course Rating − Par). Si le tee n'a
 * ni slope ni rating (cas d'un parcours saisi à la main sans ces valeurs), on
 * retombe sur l'index arrondi, ce qui est le comportement attendu entre amis.
 */
export function courseHandicap(index: number, tee: Tee, holeCount: HoleCount): number {
  // Sur 9 trous on ne joue que la moitié de son index.
  const effective = holeCount === 9 ? index / 2 : index
  if (tee.slope != null && tee.scratchRating != null) {
    return Math.round(effective * (tee.slope / 113) + (tee.scratchRating - totalPar(tee.holes)))
  }
  return Math.round(effective)
}

export function playingHandicap(
  index: number,
  tee: Tee,
  holeCount: HoleCount,
  allowance = 1,
): number {
  return Math.round(courseHandicap(index, tee, holeCount) * allowance)
}

/**
 * Coups rendus sur un trou donné.
 *
 * Règle classique : chaque joueur reçoit `floor(ph / nbTrous)` coups sur tous les
 * trous, puis un coup supplémentaire sur les `ph % nbTrous` trous les plus
 * difficiles (stroke index le plus bas). Un handicap « plus » (négatif) rend des
 * coups, en commençant par les trous les plus FACILES — d'où la symétrie inversée.
 */
export function strokesReceived(playingHcp: number, si: number, holeCount: number): number {
  if (playingHcp === 0) return 0
  const sign = Math.sign(playingHcp)
  const magnitude = Math.abs(playingHcp)
  const base = Math.floor(magnitude / holeCount)
  const remainder = magnitude % holeCount
  const extra = sign > 0 ? (si <= remainder ? 1 : 0) : (si > holeCount - remainder ? 1 : 0)
  const total = base + extra
  // `sign * 0` produirait −0, qui s'afficherait « -0 » dans la carte de score.
  return total === 0 ? 0 : sign * total
}

/** Coups rendus trou par trou, dans l'ordre des trous. */
export function strokesTable(playingHcp: number, holes: Hole[]): number[] {
  return holes.map((h) => strokesReceived(playingHcp, h.si, holes.length))
}

/** Les trous effectivement joués, dans l'ordre, pour la série de départ de la partie. */
export function roundHoles(round: Round): Hole[] {
  const tee = round.course.tees.find((t) => t.id === round.teeId) ?? round.course.tees[0]
  return tee.holes
}

export function roundTee(round: Round): Tee {
  return round.course.tees.find((t) => t.id === round.teeId) ?? round.course.tees[0]
}

/** playerId → handicap de jeu, pour la formule principale de la partie. */
export function playingHandicaps(round: Round, allowance = round.hcpAllowance): Record<string, number> {
  const tee = roundTee(round)
  const out: Record<string, number> = {}
  for (const player of round.players) {
    out[player.id] = playingHandicap(player.index, tee, round.course.holeCount, allowance)
  }
  return out
}
