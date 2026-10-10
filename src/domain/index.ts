import { computeMatchplay } from './matchplay'
import { computeScramble } from './scramble'
import { computeStableford } from './stableford'
import { computeStrokeplay } from './strokeplay'
import type { LeaderboardRow, Round } from './types'

export * from './types'
export * from './handicap'
export * from './skins'
export * from './strokeplay'
export * from './stableford'
export * from './matchplay'
export * from './scramble'
export * from './teams'
export * from './course'

/** Classement de la formule principale de la partie, quelle qu'elle soit. */
export function mainLeaderboard(round: Round): LeaderboardRow[] {
  switch (round.format) {
    case 'strokeplay':
      return computeStrokeplay(round).leaderboard
    case 'stableford':
      return computeStableford(round).leaderboard
    case 'matchplay':
      return computeMatchplay(round).leaderboard
    case 'scramble':
      return computeScramble(round).leaderboard
  }
}
