import { describe, expect, it } from 'vitest'
import { PICKED_UP, computeSkins, settle } from '../skins'
import { makeRound, player } from './fixtures'

const A = player('a', 'Anne', 0)
const B = player('b', 'Bruno', 0)
const C = player('c', 'Carla', 0)

// Pars du parcours de test : 4 4 3 5 4 4 3 4 5
// Valeur du trou :          10 10 5 15 10 10 5 10 15  (€)

describe('computeSkins — report cumulé', () => {
  // Anne gagne le trou 1 et le trou 7 ; tous les autres sont égalisés.
  const round = makeRound({
    players: [A, B],
    scores: {
      a: [4, 4, 3, 5, 4, 4, 3, 4, 5],
      b: [5, 4, 3, 5, 4, 4, 4, 4, 5],
    },
  })
  const result = computeSkins(round)

  it('attribue la valeur du trou gagné seul', () => {
    expect(result.holes[0].status).toBe('won')
    expect(result.holes[0].winnerIds).toEqual(['a'])
    expect(result.holes[0].inPlay).toBe(10)
  })

  it('cumule les reports sur les trous égalisés', () => {
    expect(result.holes[1].status).toBe('carried')
    expect(result.holes[2].carriedIn).toBe(10) // report du trou 2
    expect(result.holes[3].carriedIn).toBe(15) // + valeur du trou 3
    expect(result.holes[6].carriedIn).toBe(50)
  })

  it('fait remporter tout le report accumulé au vainqueur suivant', () => {
    // Trou 7 : 50 € de report + 5 € de valeur.
    expect(result.holes[6].status).toBe('won')
    expect(result.holes[6].inPlay).toBe(55)
    expect(result.gains.a).toBe(65) // 10 (trou 1) + 55 (trou 7)
    expect(result.gains.b).toBe(0)
  })

  it('ne fait rien payer pour le report resté sans gagnant', () => {
    // Les trous 8 et 9 restent égalisés : 10 + 15 € que personne ne remporte.
    expect(result.unresolvedPot).toBe(25)
    expect(result.paid.b).toBe(65)
    expect(result.net.a).toBe(65)
    expect(result.net.b).toBe(-65)
  })

  it('produit un bilan à somme nulle', () => {
    const sum = Object.values(result.net).reduce((x, y) => x + y, 0)
    expect(sum).toBe(0)
  })

  it('en déduit un règlement minimal', () => {
    expect(result.settlement).toEqual([{ from: 'b', to: 'a', amount: 65 }])
  })
})

describe('computeSkins — le vainqueur touche la valeur du trou', () => {
  // Trou 1 (par 4, 10 €) : Anne gagne ; Carla fait 6 et Bruno ramasse sa balle.
  const round = makeRound({
    players: [A, B, C],
    scores: {
      a: [5, null, null, null, null, null, null, null, null],
      b: [PICKED_UP, null, null, null, null, null, null, null, null],
      c: [6, null, null, null, null, null, null, null, null],
    },
  })
  const result = computeSkins(round)

  it('encaisse la valeur entière du trou, pas une part du pot', () => {
    expect(result.holes[0].status).toBe('won')
    expect(result.holes[0].winnerIds).toEqual(['a'])
    expect(result.gains.a).toBe(10)
    expect(result.net.a).toBe(10)
  })

  it('fait payer les autres joueurs à parts égales', () => {
    expect(result.paid.b).toBe(5)
    expect(result.paid.c).toBe(5)
    expect(result.net.b).toBe(-5)
    expect(result.net.c).toBe(-5)
  })

  it('fait payer aussi celui qui a ramassé sa balle', () => {
    expect(result.holes[0].effectiveScores.b).toBeNull()
    expect(result.paid.b).toBe(5)
  })

  it('reste à somme nulle', () => {
    expect(Object.values(result.net).reduce((x, y) => x + y, 0)).toBe(0)
  })

  it('ne fait rien payer sur les trous non saisis', () => {
    expect(result.holes[1].status).toBe('pending')
    expect(result.paid.c).toBe(5)
  })
})

describe('computeSkins — partage entre ex-aequo', () => {
  const round = makeRound({
    players: [A, B, C],
    scores: {
      a: [4, null, null, null, null, null, null, null, null],
      b: [4, null, null, null, null, null, null, null, null],
      c: [5, null, null, null, null, null, null, null, null],
    },
    skins: { tieRule: 'split' },
  })
  const result = computeSkins(round)

  it('divise la valeur entre les joueurs à égalité, payée par les autres', () => {
    // 10 € partagés entre Anne et Bruno ; Carla, seule perdante, paie tout.
    expect(result.holes[0].status).toBe('split')
    expect(result.gains.a).toBe(5)
    expect(result.gains.b).toBe(5)
    expect(result.paid.c).toBe(10)
    expect(result.net.c).toBe(-10)
    expect(Object.values(result.net).reduce((x, y) => x + y, 0)).toBe(0)
  })

  it('ne déplace rien quand tout le monde est à égalité', () => {
    const allTied = computeSkins(
      makeRound({
        players: [A, B],
        scores: {
          a: [4, null, null, null, null, null, null, null, null],
          b: [4, null, null, null, null, null, null, null, null],
        },
        skins: { tieRule: 'split' },
      }),
    )
    expect(allTied.holes[0].status).toBe('void')
    expect(allTied.net).toEqual({ a: 0, b: 0 })
  })
})

describe('computeSkins — en net', () => {
  // Bruno joue avec un index 9 : sur 9 trous son handicap de jeu est 5, donc il
  // reçoit un coup sur les SI 1 à 5 (les trous 1 à 5 du parcours de test).
  const round = makeRound({
    players: [A, player('b', 'Bruno', 9)],
    scores: {
      a: [4, null, null, null, null, null, null, null, null],
      b: [5, null, null, null, null, null, null, null, null],
    },
    skins: { net: true },
  })
  const result = computeSkins(round)

  it('applique les coups rendus avant de comparer', () => {
    // Anne 4 brut = 4 net ; Bruno 5 brut − 1 coup rendu = 4 net → égalité.
    expect(result.holes[0].effectiveScores).toEqual({ a: 4, b: 4 })
    expect(result.holes[0].status).toBe('carried')
  })

  it('donne un résultat différent en brut', () => {
    const gross = computeSkins({ ...round, skins: { ...round.skins, net: false } })
    expect(gross.holes[0].status).toBe('won')
    expect(gross.holes[0].winnerIds).toEqual(['a'])
  })
})

describe('computeSkins — trou annulé', () => {
  const round = makeRound({
    players: [A, B],
    scores: {
      a: [4, 4, null, null, null, null, null, null, null],
      b: [4, 5, null, null, null, null, null, null, null],
    },
    skins: { tieRule: 'void' },
  })
  const result = computeSkins(round)

  it("ne reporte rien et ne fait rien payer sur le trou annulé", () => {
    expect(result.holes[0].status).toBe('void')
    expect(result.holes[0].carriedOut).toBe(0)
    expect(result.holes[1].carriedIn).toBe(0)
    expect(result.holes[1].status).toBe('won')
    expect(result.gains.a).toBe(10)
    expect(result.net.a).toBe(10)
    expect(result.net.b).toBe(-10)
  })
})

describe('settle', () => {
  it('fait payer le plus gros débiteur au plus gros créditeur', () => {
    const transfers = settle({ a: 30, b: -20, c: -10 })
    expect(transfers).toEqual([
      { from: 'b', to: 'a', amount: 20 },
      { from: 'c', to: 'a', amount: 10 },
    ])
  })

  it('ne génère aucun virement sur un bilan nul', () => {
    expect(settle({ a: 0, b: 0 })).toEqual([])
  })

  it('répartit un débiteur sur plusieurs créditeurs', () => {
    const transfers = settle({ a: -50, b: 30, c: 20 })
    expect(transfers).toEqual([
      { from: 'a', to: 'b', amount: 30 },
      { from: 'a', to: 'c', amount: 20 },
    ])
  })
})
