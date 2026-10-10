import { roundHoles } from './handicap'
import { rank } from './strokeplay'
import { sideHasEntry, sideScores, sidesOf, type Side } from './teams'
import type { LeaderboardRow, Round } from './types'

export interface MatchplayHole {
  hole: number
  scoreA: number | null
  scoreB: number | null
  /** Identifiant du camp qui gagne le trou, `null` si partagé ou non joué. */
  winnerId: string | null
  /** Avance du camp A après ce trou (négatif = B devant). */
  state: number
  played: boolean
}

export interface MatchplayResult {
  /** `true` si la formule n'est pas applicable (il faut exactement deux camps). */
  invalid: boolean
  sides: Side[]
  holes: MatchplayHole[]
  /** Avance finale du camp A. */
  lead: number
  holesPlayed: number
  remaining: number
  /** Le match est joué : l'avance dépasse le nombre de trous restants. */
  closed: boolean
  /** « 3&2 », « 2 up », « all square », « dormie 2 »… */
  resultText: string
  leaderId: string | null
  leaderboard: LeaderboardRow[]
}

export function computeMatchplay(round: Round): MatchplayResult {
  const sides = sidesOf(round)
  const holeList = roundHoles(round)

  if (sides.length !== 2) {
    return {
      invalid: true,
      sides,
      holes: [],
      lead: 0,
      holesPlayed: 0,
      remaining: holeList.length,
      closed: false,
      resultText: 'Le match play se joue entre deux camps',
      leaderId: null,
      leaderboard: [],
    }
  }

  const [a, b] = sides
  const scoresA = sideScores(round, a, round.net)
  const scoresB = sideScores(round, b, round.net)

  const holes: MatchplayHole[] = []
  let state = 0
  let holesPlayed = 0
  let closedAt = -1
  let stateAtClose = 0

  holeList.forEach((hole, i) => {
    const played = sideHasEntry(round, a, i) && sideHasEntry(round, b, i)
    let winnerId: string | null = null
    if (played) {
      holesPlayed++
      const sa = scoresA[i]
      const sb = scoresB[i]
      if (sa !== null && (sb === null || sa < sb)) {
        state += 1
        winnerId = a.id
      } else if (sb !== null && (sa === null || sb < sa)) {
        state -= 1
        winnerId = b.id
      }
      // Le match se referme dès que l'avance dépasse le nombre de trous restants.
      // On retient l'avance À CE MOMENT-LÀ : le score annoncé est celui du trou
      // où le match s'est joué, pas celui du 18 si les joueurs ont continué.
      if (closedAt === -1 && Math.abs(state) > holeList.length - (i + 1)) {
        closedAt = i
        stateAtClose = state
      }
    }
    holes.push({
      hole: hole.number,
      scoreA: scoresA[i],
      scoreB: scoresB[i],
      winnerId,
      state,
      played,
    })
  })

  const remaining = holeList.length - holesPlayed
  const closed = closedAt !== -1
  const lead = Math.abs(state)
  const leaderId = state === 0 ? null : state > 0 ? a.id : b.id
  const leaderLabel = state > 0 ? a.label : b.label

  let resultText: string
  if (closed) {
    const holesLeftAtClose = holeList.length - (closedAt + 1)
    const winnerLabel = stateAtClose > 0 ? a.label : b.label
    const margin = Math.abs(stateAtClose)
    resultText =
      holesLeftAtClose > 0
        ? `${winnerLabel} gagne ${margin}&${holesLeftAtClose}`
        : `${winnerLabel} gagne ${margin} up`
  } else if (remaining === 0) {
    resultText = state === 0 ? 'Match nul (all square)' : `${leaderLabel} gagne ${lead} up`
  } else if (lead === remaining && lead > 0) {
    resultText = `${leaderLabel} dormie ${lead}`
  } else if (state === 0) {
    resultText = `All square · ${remaining} trous restants`
  } else {
    resultText = `${leaderLabel} ${lead} up · ${remaining} trous restants`
  }

  const leaderboard = rank([
    {
      key: a.id,
      label: a.label,
      sortValue: -state,
      display: state > 0 ? `${lead} up` : state < 0 ? `${lead} down` : 'AS',
      holesPlayed,
      rank: 0,
    },
    {
      key: b.id,
      label: b.label,
      sortValue: state,
      display: state < 0 ? `${lead} up` : state > 0 ? `${lead} down` : 'AS',
      holesPlayed,
      rank: 0,
    },
  ])

  return {
    invalid: false,
    sides,
    holes,
    lead: state,
    holesPlayed,
    remaining,
    closed,
    resultText,
    leaderId,
    leaderboard,
  }
}
