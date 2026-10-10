import type { Course } from '@/domain/types'

/** Parcours d'exemple, pour avoir quelque chose à jouer dès la première ouverture.
 *  Ce sont des cartes fictives : remplace-les par tes vrais parcours via
 *  l'éditeur ou l'import en ligne. */

function holes(pars: number[], sis: number[], meters: number[]) {
  return pars.map((par, i) => ({ number: i + 1, par, si: sis[i], meters: meters[i] }))
}

const lacPars = [4, 5, 3, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4]
const lacSis = [7, 3, 15, 1, 11, 17, 5, 9, 13, 8, 16, 4, 2, 12, 18, 10, 6, 14]
const lacMetersYellow = [
  352, 478, 158, 385, 341, 142, 465, 374, 329, 361, 165, 486, 398, 318, 136, 347, 492, 356,
]
const lacMetersBlue = lacMetersYellow.map((m) => m + 24)

export const SAMPLE_COURSES: Course[] = [
  {
    id: 'sample-lac',
    clubName: 'Golf du Lac (exemple)',
    courseName: 'Grand parcours',
    holeCount: 18,
    source: 'sample',
    updatedAt: '2026-01-01T00:00:00.000Z',
    tees: [
      {
        id: 'sample-lac-jaune',
        name: 'Jaune',
        gender: 'M',
        scratchRating: 70.8,
        slope: 128,
        holes: holes(lacPars, lacSis, lacMetersYellow),
      },
      {
        id: 'sample-lac-bleu',
        name: 'Bleu',
        gender: 'M',
        scratchRating: 72.4,
        slope: 133,
        holes: holes(lacPars, lacSis, lacMetersBlue),
      },
      {
        id: 'sample-lac-rouge',
        name: 'Rouge',
        gender: 'F',
        scratchRating: 72.1,
        slope: 126,
        holes: holes(lacPars, lacSis, lacMetersYellow.map((m) => m - 42)),
      },
    ],
  },
  {
    id: 'sample-compact',
    clubName: 'Golf des Pins (exemple)',
    courseName: 'Compact 9 trous',
    holeCount: 9,
    source: 'sample',
    updatedAt: '2026-01-01T00:00:00.000Z',
    tees: [
      {
        id: 'sample-compact-jaune',
        name: 'Jaune',
        gender: 'M',
        scratchRating: 33.2,
        slope: 112,
        holes: holes(
          [3, 4, 3, 4, 3, 5, 3, 4, 3],
          [5, 1, 7, 3, 9, 2, 8, 4, 6],
          [146, 318, 132, 341, 118, 452, 161, 296, 139],
        ),
      },
    ],
  },
]
