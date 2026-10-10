import { describe, expect, it } from 'vitest'
import { STORE_VERSION, migrateState } from '../migrate'

// Une donnée telle qu'enregistrée par la version 1 de l'app.
const v1 = () => ({
  courses: [{ id: 'c1', clubName: 'Golf de Pessac' }],
  players: [{ id: 'p1', name: 'Pierre', index: 18.4 }],
  theme: 'light',
  rounds: [
    {
      id: 'r1',
      scores: { p1: [5, 4] },
      skins: { enabled: true, net: false, stakeByPar: { 3: 1, 4: 2, 5: 3 }, tieRule: 'carryOver' },
    },
  ],
})

describe('migrateState', () => {
  it('conserve tout et renomme le montant du skins (v1 → v2)', () => {
    const state = migrateState(v1(), 1) as ReturnType<typeof v1> & {
      rounds: { skins: Record<string, unknown> }[]
    }
    expect(state.rounds[0].skins.valueByPar).toEqual({ 3: 1, 4: 2, 5: 3 })
    expect('stakeByPar' in state.rounds[0].skins).toBe(false)
    // Rien d'autre ne bouge : parcours, joueurs, scores, réglages.
    expect(state.courses).toEqual(v1().courses)
    expect(state.players).toEqual(v1().players)
    expect(state.theme).toBe('light')
    expect(state.rounds[0].scores).toEqual({ p1: [5, 4] })
  })

  it('laisse intacte une donnée déjà à jour', () => {
    const current = { ...v1(), rounds: [] }
    expect(migrateState(current, STORE_VERSION)).toEqual(current)
  })

  it('ne plante pas sur une donnée illisible ou sans parties', () => {
    expect(migrateState(null, 1)).toBeNull()
    expect(migrateState('abc', 1)).toBe('abc')
    expect(migrateState({ courses: [] }, 1)).toEqual({ courses: [] })
    expect(() => migrateState({ rounds: [null, 3, { skins: null }] }, 1)).not.toThrow()
  })
})
