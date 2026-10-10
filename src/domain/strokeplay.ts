import { playingHandicaps, roundHoles, strokesReceived, totalPar } from './handicap'
import { PICKED_UP } from './skins'
import type { LeaderboardRow, Round } from './types'

export interface StrokeplayLine {
  playerId: string
  playingHcp: number
  /** Coups par trou tels que saisis (`null` = non saisi, `0` = ramassée). */
  gross: (number | null)[]
  /** Score retenu par trou, avec le maximum appliqué sur les balles ramassées. */
  counted: (number | null)[]
  net: (number | null)[]
  grossTotal: number
  netTotal: number
  holesPlayed: number
  /** Total brut par rapport au par des trous joués. */
  toPar: number
}

export interface StrokeplayResult {
  lines: StrokeplayLine[]
  leaderboard: LeaderboardRow[]
  parPlayed: number
}

/**
 * Score maximum retenu quand la balle est ramassée : double bogey net, comme le
 * prévoit le WHS. Sans cette convention un trou non rentré rendrait le total
 * impossible à calculer.
 */
export function maxScore(par: number, given: number): number {
  return par + given + 2
}

export function computeStrokeplay(round: Round): StrokeplayResult {
  const holes = roundHoles(round)
  const holeCount = holes.length
  const hcps = playingHandicaps(round)

  const lines: StrokeplayLine[] = round.participants.map(({ playerId }) => {
    const ph = hcps[playerId] ?? 0
    const gross = holes.map((_, i) => round.scores[playerId]?.[i] ?? null)
    const counted: (number | null)[] = []
    const net: (number | null)[] = []
    let grossTotal = 0
    let netTotal = 0
    let holesPlayed = 0
    let parPlayedByPlayer = 0

    holes.forEach((hole, i) => {
      const given = strokesReceived(ph, hole.si, holeCount)
      const raw = gross[i]
      if (raw === null) {
        counted.push(null)
        net.push(null)
        return
      }
      const score = raw === PICKED_UP ? maxScore(hole.par, given) : raw
      counted.push(score)
      net.push(score - given)
      grossTotal += score
      netTotal += score - given
      parPlayedByPlayer += hole.par
      holesPlayed++
    })

    return {
      playerId,
      playingHcp: ph,
      gross,
      counted,
      net,
      grossTotal,
      netTotal,
      holesPlayed,
      toPar: grossTotal - parPlayedByPlayer,
    }
  })

  const useNet = round.net
  // Comme sur un classement de tournoi, on classe et on affiche le score par
  // rapport au par : c'est la seule mesure comparable quand les joueurs n'ont
  // pas tous joué le même nombre de trous.
  const leaderboard: LeaderboardRow[] = rank(
    lines.map((line) => {
      const parPlayed = line.grossTotal - line.toPar
      const toPar = useNet ? line.netTotal - parPlayed : line.toPar
      return {
        key: line.playerId,
        label: nameOf(round, line.playerId),
        sortValue: toPar,
        display: formatToPar(toPar),
        toPar,
        secondary: useNet
          ? `${line.netTotal} net · brut ${line.grossTotal} · hcp ${formatHcp(line.playingHcp)}`
          : `${line.grossTotal} coups`,
        holesPlayed: line.holesPlayed,
        rank: 0,
      }
    }),
  )

  return { lines, leaderboard, parPlayed: totalPar(holes) }
}

export function nameOf(round: Round, playerId: string): string {
  return round.players.find((p) => p.id === playerId)?.name ?? '—'
}

export function formatToPar(toPar: number): string {
  if (toPar === 0) return 'E'
  return toPar > 0 ? `+${toPar}` : String(toPar)
}

export function formatHcp(ph: number): string {
  return ph < 0 ? `+${-ph}` : String(ph)
}

/** Trie et attribue les rangs, en partageant le rang en cas d'égalité. */
export function rank(rows: LeaderboardRow[]): LeaderboardRow[] {
  const sorted = [...rows].sort((a, b) => {
    if (b.holesPlayed === 0 && a.holesPlayed === 0) return 0
    if (a.holesPlayed === 0) return 1
    if (b.holesPlayed === 0) return -1
    return a.sortValue - b.sortValue
  })
  let lastValue: number | null = null
  let lastRank = 0
  sorted.forEach((row, i) => {
    if (lastValue !== null && row.sortValue === lastValue) {
      row.rank = lastRank
    } else {
      row.rank = i + 1
      lastRank = i + 1
      lastValue = row.sortValue
    }
  })
  return sorted
}
