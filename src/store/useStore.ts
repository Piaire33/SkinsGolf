import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SAMPLE_COURSES } from '@/data/sampleCourses'
import { uid } from '@/domain/course'
import type { Course, Format, Participant, Player, Round, SkinsConfig } from '@/domain/types'
import type { BrandStyle, ThemeChoice } from '@/theme'
import { STORE_VERSION, migrateState } from './migrate'

export interface NewRoundInput {
  course: Course
  teeId: string
  format: Format
  net: boolean
  hcpAllowance: number
  participants: Participant[]
  skins: SkinsConfig
}

interface State {
  courses: Course[]
  players: Player[]
  /** Parties les plus récentes en premier. */
  rounds: Round[]
  theme: ThemeChoice
  brandStyle: BrandStyle

  upsertCourse: (course: Course) => void
  deleteCourse: (id: string) => void

  upsertPlayer: (player: Player) => void
  deletePlayer: (id: string) => void

  createRound: (input: NewRoundInput) => Round
  setScore: (roundId: string, playerId: string, holeIndex: number, value: number | null) => void
  bumpScore: (roundId: string, playerId: string, holeIndex: number, delta: number, par: number) => void
  setCurrentHole: (roundId: string, hole: number) => void
  finishRound: (roundId: string) => void
  reopenRound: (roundId: string) => void
  deleteRound: (roundId: string) => void

  setTheme: (theme: ThemeChoice) => void
  setBrandStyle: (style: BrandStyle) => void
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      courses: SAMPLE_COURSES,
      players: [],
      rounds: [],
      theme: 'dark',
      brandStyle: 'dpworld',

      upsertCourse: (course) =>
        set((s) => {
          const stamped = { ...course, updatedAt: new Date().toISOString() }
          const exists = s.courses.some((c) => c.id === course.id)
          return {
            courses: exists
              ? s.courses.map((c) => (c.id === course.id ? stamped : c))
              : [...s.courses, stamped],
          }
        }),

      deleteCourse: (id) => set((s) => ({ courses: s.courses.filter((c) => c.id !== id) })),

      upsertPlayer: (player) =>
        set((s) => ({
          players: s.players.some((p) => p.id === player.id)
            ? s.players.map((p) => (p.id === player.id ? player : p))
            : [...s.players, player],
        })),

      deletePlayer: (id) => set((s) => ({ players: s.players.filter((p) => p.id !== id) })),

      createRound: (input) => {
        const tee = input.course.tees.find((t) => t.id === input.teeId) ?? input.course.tees[0]
        const holeCount = tee.holes.length
        const scores: Record<string, (number | null)[]> = {}
        for (const participant of input.participants) {
          scores[participant.playerId] = Array<number | null>(holeCount).fill(null)
        }
        // Le parcours et les joueurs sont figés dans la partie : modifier une
        // carte de score plus tard ne doit pas réécrire une partie passée.
        const players = input.participants
          .map(({ playerId }) => get().players.find((p) => p.id === playerId))
          .filter((p): p is Player => Boolean(p))

        const round: Round = {
          id: uid(),
          date: new Date().toISOString(),
          courseId: input.course.id,
          teeId: tee.id,
          course: structuredClone(input.course),
          players: structuredClone(players),
          format: input.format,
          net: input.net,
          hcpAllowance: input.hcpAllowance,
          participants: input.participants,
          skins: input.skins,
          scores,
          currentHole: 1,
          status: 'inProgress',
        }
        set((s) => ({ rounds: [round, ...s.rounds] }))
        return round
      },

      setScore: (roundId, playerId, holeIndex, value) =>
        set((s) => ({
          rounds: s.rounds.map((r) => {
            if (r.id !== roundId) return r
            const current = r.scores[playerId] ?? []
            const next = [...current]
            next[holeIndex] = value
            return { ...r, scores: { ...r.scores, [playerId]: next } }
          }),
        })),

      // Incrément relatif calculé dans le store et non dans le composant : deux
      // appuis rapides sur « + » sont groupés par React dans le même rendu, et
      // relireraient tous les deux la même valeur périmée.
      bumpScore: (roundId, playerId, holeIndex, delta, par) =>
        set((s) => ({
          rounds: s.rounds.map((r) => {
            if (r.id !== roundId) return r
            const current = r.scores[playerId] ?? []
            // Première saisie, ou reprise après une balle ramassée (score 0) :
            // on part du par, le score le plus probable.
            const from = current[holeIndex] || par
            const next = [...current]
            next[holeIndex] = Math.max(1, Math.min(20, from + delta))
            return { ...r, scores: { ...r.scores, [playerId]: next } }
          }),
        })),

      setCurrentHole: (roundId, hole) =>
        set((s) => ({
          rounds: s.rounds.map((r) => (r.id === roundId ? { ...r, currentHole: hole } : r)),
        })),

      finishRound: (roundId) =>
        set((s) => ({
          rounds: s.rounds.map((r) => (r.id === roundId ? { ...r, status: 'finished' } : r)),
        })),

      reopenRound: (roundId) =>
        set((s) => ({
          rounds: s.rounds.map((r) => (r.id === roundId ? { ...r, status: 'inProgress' } : r)),
        })),

      deleteRound: (roundId) => set((s) => ({ rounds: s.rounds.filter((r) => r.id !== roundId) })),

      setTheme: (theme) => set({ theme }),

      setBrandStyle: (brandStyle) => set({ brandStyle }),
    }),
    {
      name: 'skinsgolf',
      version: STORE_VERSION,
      migrate: (persisted, version) => migrateState(persisted, version) as State,
    },
  ),
)

export const useCourse = (id: string | undefined) =>
  useStore((s) => s.courses.find((c) => c.id === id))

export const useRound = (id: string | undefined) => useStore((s) => s.rounds.find((r) => r.id === id))

export const useActiveRound = () => useStore((s) => s.rounds.find((r) => r.status === 'inProgress'))
