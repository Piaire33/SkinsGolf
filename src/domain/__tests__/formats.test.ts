import { describe, expect, it } from 'vitest'
import { computeMatchplay } from '../matchplay'
import { computeScramble } from '../scramble'
import { computeStableford, stablefordPoints } from '../stableford'
import { computeStrokeplay, maxScore } from '../strokeplay'
import { PICKED_UP } from '../skins'
import { makeRound, player } from './fixtures'

const A = player('a', 'Anne', 0)
const B = player('b', 'Bruno', 0)

// Parcours de test : pars 4 4 3 5 4 4 3 4 5 → par 36, SI 1 à 9 dans l'ordre.
const PAR_ROUND = [4, 4, 3, 5, 4, 4, 3, 4, 5]

describe('stablefordPoints', () => {
  it('donne 2 points pour le par net', () => {
    expect(stablefordPoints(4, 0, 4)).toBe(2)
    expect(stablefordPoints(4, 1, 5)).toBe(2)
  })

  it('ajoute un point par coup sous le par net', () => {
    expect(stablefordPoints(4, 0, 3)).toBe(3)
    expect(stablefordPoints(4, 0, 2)).toBe(4)
    expect(stablefordPoints(5, 2, 4)).toBe(5)
  })

  it('ne descend jamais sous zéro', () => {
    expect(stablefordPoints(4, 0, 6)).toBe(0)
    expect(stablefordPoints(4, 0, 12)).toBe(0)
  })

  it('ne rapporte rien sur une balle ramassée', () => {
    expect(stablefordPoints(5, 3, PICKED_UP)).toBe(0)
  })
})

describe('computeStableford', () => {
  it('totalise 18 points pour un tour en par sur 9 trous', () => {
    const round = makeRound({ players: [A], scores: { a: PAR_ROUND }, format: 'stableford' })
    expect(computeStableford(round).lines[0].total).toBe(18)
  })

  it('classe le plus grand total en premier', () => {
    const round = makeRound({
      players: [A, B],
      scores: { a: PAR_ROUND, b: PAR_ROUND.map((p) => p + 1) },
      format: 'stableford',
    })
    const board = computeStableford(round).leaderboard
    expect(board[0].key).toBe('a')
    expect(board[0].display).toBe('18 pts')
    expect(board[1].display).toBe('9 pts')
  })

  it('crédite les coups rendus en net', () => {
    // Index 9 sur 9 trous → handicap de jeu 5 → un coup sur les trous 1 à 5.
    const round = makeRound({
      players: [player('a', 'Anne', 9)],
      scores: { a: PAR_ROUND },
      format: 'stableford',
      net: true,
    })
    // 5 trous à 3 points + 4 trous à 2 points.
    expect(computeStableford(round).lines[0].total).toBe(5 * 3 + 4 * 2)
  })
})

describe('computeStrokeplay', () => {
  it('totalise le brut et le net', () => {
    const round = makeRound({
      players: [player('a', 'Anne', 9)],
      scores: { a: PAR_ROUND },
      net: true,
    })
    const line = computeStrokeplay(round).lines[0]
    expect(line.grossTotal).toBe(36)
    expect(line.netTotal).toBe(31) // 36 − 5 coups rendus
    expect(line.toPar).toBe(0)
    expect(line.holesPlayed).toBe(9)
  })

  it('ignore les trous non saisis dans le total', () => {
    const round = makeRound({
      players: [A],
      scores: { a: [4, 5, null, null, null, null, null, null, null] },
    })
    const line = computeStrokeplay(round).lines[0]
    expect(line.grossTotal).toBe(9)
    expect(line.holesPlayed).toBe(2)
    expect(line.toPar).toBe(1)
  })

  it('applique le double bogey net aux balles ramassées', () => {
    expect(maxScore(4, 0)).toBe(6)
    expect(maxScore(4, 2)).toBe(8)
    const round = makeRound({
      players: [A],
      scores: { a: [PICKED_UP, null, null, null, null, null, null, null, null] },
    })
    expect(computeStrokeplay(round).lines[0].grossTotal).toBe(6)
  })
})

describe('computeMatchplay', () => {
  it('refuse une partie qui ne compte pas deux camps', () => {
    const round = makeRound({
      players: [A, B, player('c', 'Carla', 0)],
      scores: { a: PAR_ROUND, b: PAR_ROUND, c: PAR_ROUND },
      format: 'matchplay',
    })
    expect(computeMatchplay(round).invalid).toBe(true)
  })

  it('compte les trous gagnés et donne l’état du match', () => {
    // Anne gagne les trous 1 et 2, Bruno le trou 3, égalité ensuite.
    const round = makeRound({
      players: [A, B],
      scores: {
        a: [4, 4, 4, 5, 4, 4, 3, 4, 5],
        b: [5, 5, 3, 5, 4, 4, 3, 4, 5],
      },
      format: 'matchplay',
    })
    const result = computeMatchplay(round)
    expect(result.invalid).toBe(false)
    expect(result.holesPlayed).toBe(9)
    expect(result.lead).toBe(1)
    expect(result.resultText).toContain('Anne gagne 1 up')
  })

  it('referme le match dès que l’avance dépasse les trous restants', () => {
    // Anne gagne les six premiers trous. Le match est joué dès le trou 5 : elle
    // y est 5 up avec 4 trous à jouer. Le score annoncé doit être celui de ce
    // moment-là (5&4), même si les joueurs continuent le parcours.
    const round = makeRound({
      players: [A, B],
      scores: {
        a: [4, 4, 3, 5, 4, 4, 3, 4, 5],
        b: [5, 5, 4, 6, 5, 5, 3, 4, 5],
      },
      format: 'matchplay',
    })
    const result = computeMatchplay(round)
    expect(result.closed).toBe(true)
    expect(result.resultText).toBe('Anne gagne 5&4')
  })

  it('annonce dormie quand l’avance égale les trous restants', () => {
    // Anne gagne les deux premiers trous puis égalise jusqu'au trou 7 : elle est
    // 2 up avec 2 trous à jouer, Bruno ne peut plus que recoller.
    const round = makeRound({
      players: [A, B],
      scores: {
        a: [4, 4, 3, 5, 4, 4, 3, null, null],
        b: [5, 5, 3, 5, 4, 4, 3, null, null],
      },
      format: 'matchplay',
    })
    const result = computeMatchplay(round)
    expect(result.closed).toBe(false)
    expect(result.remaining).toBe(2)
    expect(result.resultText).toBe('Anne dormie 2')
  })

  it('annonce un match nul quand tout est égalisé', () => {
    const round = makeRound({
      players: [A, B],
      scores: { a: PAR_ROUND, b: PAR_ROUND },
      format: 'matchplay',
    })
    expect(computeMatchplay(round).resultText).toBe('Match nul (all square)')
  })
})

describe('computeScramble', () => {
  it('retient le meilleur score de chaque équipe trou par trou', () => {
    const round = makeRound({
      players: [A, B, player('c', 'Carla', 0), player('d', 'David', 0)],
      scores: {
        a: [4, 6, 3, 5, 4, 4, 3, 4, 5],
        b: [5, 4, 4, 6, 5, 4, 4, 5, 5],
        c: [5, 5, 3, 6, 4, 5, 3, 5, 6],
        d: [5, 5, 4, 5, 5, 5, 4, 4, 6],
      },
      format: 'scramble',
      teams: { a: 'A', b: 'A', c: 'B', d: 'B' },
    })
    const { lines, leaderboard } = computeScramble(round)
    const teamA = lines.find((l) => l.side.id === 'A')!
    expect(teamA.perHole).toEqual([4, 4, 3, 5, 4, 4, 3, 4, 5])
    expect(teamA.total).toBe(36)
    expect(teamA.toPar).toBe(0)
    expect(teamA.side.label).toBe('Anne & Bruno')
    expect(leaderboard[0].key).toBe('A')
  })
})
