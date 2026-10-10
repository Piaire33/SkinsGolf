import type { Course, Format, Player, Round, SkinsConfig, SkinsTieRule } from '../types'

/** Parcours de test : 9 trous, par 36, stroke index 1 à 9 dans l'ordre. Un SI
 *  croissant rend les attentes des tests lisibles à l'œil nu. */
export const TEST_COURSE: Course = {
  id: 'c1',
  clubName: 'Test',
  courseName: '9 trous',
  holeCount: 9,
  source: 'manual',
  updatedAt: '2026-01-01T00:00:00.000Z',
  tees: [
    {
      id: 't1',
      name: 'Jaune',
      holes: [
        { number: 1, par: 4, si: 1 },
        { number: 2, par: 4, si: 2 },
        { number: 3, par: 3, si: 3 },
        { number: 4, par: 5, si: 4 },
        { number: 5, par: 4, si: 5 },
        { number: 6, par: 4, si: 6 },
        { number: 7, par: 3, si: 7 },
        { number: 8, par: 4, si: 8 },
        { number: 9, par: 5, si: 9 },
      ],
    },
  ],
}

export function player(id: string, name: string, index: number): Player {
  return { id, name, index }
}

export const DEFAULT_SKINS: SkinsConfig = {
  enabled: true,
  net: false,
  valueByPar: { 3: 5, 4: 10, 5: 15 },
  tieRule: 'carryOver',
}

export function makeRound(options: {
  players: Player[]
  scores: Record<string, (number | null)[]>
  format?: Format
  net?: boolean
  allowance?: number
  skins?: Partial<SkinsConfig>
  teams?: Record<string, string>
  tieRule?: SkinsTieRule
}): Round {
  const {
    players,
    scores,
    format = 'strokeplay',
    net = false,
    allowance = 1,
    skins = {},
    teams,
  } = options
  return {
    id: 'r1',
    date: '2026-01-01T10:00:00.000Z',
    courseId: TEST_COURSE.id,
    teeId: 't1',
    course: TEST_COURSE,
    players,
    format,
    net,
    hcpAllowance: allowance,
    participants: players.map((p) => ({
      playerId: p.id,
      ...(teams ? { teamId: teams[p.id] } : {}),
    })),
    skins: { ...DEFAULT_SKINS, ...skins },
    scores,
    currentHole: 1,
    status: 'inProgress',
  }
}
