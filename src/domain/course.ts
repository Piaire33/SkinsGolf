import { totalPar } from './handicap'
import type { Course, Hole, HoleCount, Tee } from './types'

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/** Répartition de par la plus courante : 4 par 3, 4 par 5, le reste en par 4. */
const DEFAULT_PARS_18 = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5]

/** Convention des cartes de score : stroke index impairs à l'aller, pairs au retour. */
function defaultSi(index: number, holeCount: HoleCount): number {
  if (holeCount === 9) return index + 1
  return index < 9 ? index * 2 + 1 : (index - 9) * 2 + 2
}

export function blankHoles(holeCount: HoleCount): Hole[] {
  return Array.from({ length: holeCount }, (_, i) => ({
    number: i + 1,
    par: DEFAULT_PARS_18[i] ?? 4,
    si: defaultSi(i, holeCount),
  }))
}

export function blankTee(holeCount: HoleCount, name = 'Jaune'): Tee {
  return { id: uid(), name, holes: blankHoles(holeCount) }
}

export function blankCourse(holeCount: HoleCount = 18): Course {
  return {
    id: uid(),
    clubName: '',
    courseName: holeCount === 9 ? '9 trous' : 'Parcours 18 trous',
    holeCount,
    tees: [blankTee(holeCount)],
    source: 'manual',
    updatedAt: new Date().toISOString(),
  }
}

/** Erreurs bloquantes empêchant de démarrer une partie sur ce parcours. */
export function validateCourse(course: Course): string[] {
  const errors: string[] = []
  if (!course.clubName.trim()) errors.push('Le nom du club est obligatoire.')
  if (course.tees.length === 0) errors.push('Ajoutez au moins une série de départ.')

  course.tees.forEach((tee) => {
    const prefix = `Série « ${tee.name || '?'} » : `
    if (tee.holes.length !== course.holeCount) {
      errors.push(`${prefix}${tee.holes.length} trous saisis au lieu de ${course.holeCount}.`)
      return
    }
    for (const hole of tee.holes) {
      if (hole.par < 3 || hole.par > 6) {
        errors.push(`${prefix}le par du trou ${hole.number} doit être entre 3 et 6.`)
      }
    }
    const expected = new Set(Array.from({ length: course.holeCount }, (_, i) => i + 1))
    const seen = new Set<number>()
    for (const hole of tee.holes) {
      if (seen.has(hole.si)) {
        errors.push(`${prefix}le stroke index ${hole.si} apparaît plusieurs fois.`)
      }
      seen.add(hole.si)
      expected.delete(hole.si)
    }
    if (expected.size > 0) {
      const missing = [...expected].sort((a, b) => a - b).join(', ')
      errors.push(`${prefix}stroke index manquants : ${missing}.`)
    }
  })

  return errors
}

export function outInTotals(holes: Hole[]): { out: number; in: number; total: number } {
  const out = totalPar(holes.slice(0, 9))
  const back = totalPar(holes.slice(9))
  return { out, in: back, total: out + back }
}

/** Les pars présents sur le parcours, triés — sert à générer les champs de valeur du skins. */
export function distinctPars(holes: Hole[]): number[] {
  return [...new Set(holes.map((h) => h.par))].sort((a, b) => a - b)
}

/** Valeurs par défaut : 1 € sur un par 3, 2 € sur un par 4, 3 € sur un par 5. */
export function defaultValueByPar(holes: Hole[]): Record<number, number> {
  const out: Record<number, number> = {}
  for (const par of distinctPars(holes)) out[par] = par - 2
  return out
}

export function courseLabel(course: Course): string {
  return course.courseName && course.courseName !== course.clubName
    ? `${course.clubName} — ${course.courseName}`
    : course.clubName
}

export function teeTotalMeters(tee: Tee): number | null {
  const withMeters = tee.holes.filter((h) => h.meters != null)
  if (withMeters.length === 0) return null
  return withMeters.reduce((sum, h) => sum + (h.meters ?? 0), 0)
}
