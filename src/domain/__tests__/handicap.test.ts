import { describe, expect, it } from 'vitest'
import { courseHandicap, playingHandicap, strokesReceived, strokesTable } from '../handicap'
import { TEST_COURSE } from './fixtures'

describe('strokesReceived', () => {
  it('ne rend aucun coup à un joueur scratch', () => {
    for (let si = 1; si <= 18; si++) {
      expect(strokesReceived(0, si, 18)).toBe(0)
    }
  })

  it('rend un coup sur les trous les plus difficiles', () => {
    // Handicap 5 sur 18 trous : un coup sur les SI 1 à 5, rien au-delà.
    expect(strokesReceived(5, 1, 18)).toBe(1)
    expect(strokesReceived(5, 5, 18)).toBe(1)
    expect(strokesReceived(5, 6, 18)).toBe(0)
    expect(strokesReceived(5, 18, 18)).toBe(0)
  })

  it('distribue un coup partout quand le handicap égale le nombre de trous', () => {
    const table = strokesTable(18, TEST_COURSE.tees[0].holes.concat(TEST_COURSE.tees[0].holes))
    expect(table.every((n) => n === 1)).toBe(true)
  })

  it('fait un deuxième tour de distribution au-delà de 18', () => {
    // Handicap 22 : deux coups sur les SI 1 à 4, un seul sur le reste.
    expect(strokesReceived(22, 1, 18)).toBe(2)
    expect(strokesReceived(22, 4, 18)).toBe(2)
    expect(strokesReceived(22, 5, 18)).toBe(1)
    expect(strokesReceived(22, 18, 18)).toBe(1)
  })

  it('fait rendre des coups à un joueur « plus », en partant des trous faciles', () => {
    // Handicap +2 (soit −2) : le joueur rend un coup sur les deux trous les plus faciles.
    expect(strokesReceived(-2, 18, 18)).toBe(-1)
    expect(strokesReceived(-2, 17, 18)).toBe(-1)
    expect(strokesReceived(-2, 16, 18)).toBe(0)
    expect(strokesReceived(-2, 1, 18)).toBe(0)
  })

  it('respecte le total sur un parcours de 9 trous', () => {
    const total = TEST_COURSE.tees[0].holes
      .map((h) => strokesReceived(7, h.si, 9))
      .reduce((a, b) => a + b, 0)
    expect(total).toBe(7)
  })
})

describe('courseHandicap', () => {
  const tee = TEST_COURSE.tees[0]

  it("retombe sur l'index arrondi sans slope ni rating", () => {
    // 9 trous : on ne joue que la moitié de son index.
    expect(courseHandicap(18, tee, 9)).toBe(9)
    expect(courseHandicap(18, tee, 18)).toBe(18)
    expect(courseHandicap(11.4, tee, 18)).toBe(11)
  })

  it('applique la formule WHS quand slope et rating sont connus', () => {
    const rated = { ...tee, slope: 128, scratchRating: 37 }
    // 18 × 128/113 + (37 − 36) = 20.39 + 1 → 21
    expect(courseHandicap(18, rated, 18)).toBe(21)
  })

  it('applique le pourcentage de handicap', () => {
    expect(playingHandicap(20, tee, 18, 0.75)).toBe(15)
    expect(playingHandicap(20, tee, 18, 0.95)).toBe(19)
  })
})
