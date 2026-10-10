/** Modèle de données de l'application. Tout est sérialisable en JSON : le store
 *  entier est écrit dans localStorage, et une partie doit survivre à la fermeture
 *  de l'app au milieu du neuvième trou. */

export type HoleCount = 9 | 18

export interface Hole {
  /** 1 à 18 */
  number: number
  par: number
  /** Stroke index : 1 = trou le plus difficile, utilisé pour répartir les coups rendus. */
  si: number
  meters?: number
}

export interface Tee {
  id: string
  /** « Jaune », « Blanc », « Bleu », « Rouge »… */
  name: string
  gender?: 'M' | 'F'
  /** SSS / course rating de la série de départ. */
  scratchRating?: number
  slope?: number
  holes: Hole[]
}

export type CourseSource = 'manual' | 'api' | 'import' | 'sample'

export interface Course {
  id: string
  clubName: string
  courseName: string
  holeCount: HoleCount
  tees: Tee[]
  source: CourseSource
  /** Identifiant GolfCourseAPI, pour éviter les doublons lors d'un réimport. */
  externalId?: string
  updatedAt: string
}

export interface Player {
  id: string
  name: string
  /** Index WHS. Peut être négatif pour un joueur « plus ». */
  index: number
}

export type Format = 'strokeplay' | 'stableford' | 'matchplay' | 'scramble'

export const FORMAT_LABELS: Record<Format, string> = {
  strokeplay: 'Stroke play',
  stableford: 'Stableford',
  matchplay: 'Match play',
  scramble: 'Scramble / Best-ball',
}

export type SkinsTieRule = 'carryOver' | 'split' | 'void'

export interface SkinsConfig {
  enabled: boolean
  /** true = scores nets (coups rendus selon le stroke index), false = brut. */
  net: boolean
  /** Valeur d'un trou en euros, indexée par son par : ce que touche son vainqueur,
   *  payé à parts égales par les autres joueurs. */
  valueByPar: Record<number, number>
  tieRule: SkinsTieRule
}

export interface Participant {
  playerId: string
  /** Renseigné uniquement en scramble / best-ball / match play par équipes. */
  teamId?: string
}

export type RoundStatus = 'inProgress' | 'finished'

export interface Round {
  id: string
  /** ISO 8601. */
  date: string
  courseId: string
  teeId: string
  /** Copie figée du parcours et des joueurs au moment du départ : modifier une
   *  carte de score ou l'index d'un joueur plus tard ne doit pas réécrire
   *  l'historique des parties déjà jouées. */
  course: Course
  players: Player[]
  format: Format
  /** Formule principale jouée en net (le skins a son propre réglage). */
  net: boolean
  /** Pourcentage de handicap appliqué : 1 = 100 %, 0.95, 0.75… */
  hcpAllowance: number
  participants: Participant[]
  skins: SkinsConfig
  /** playerId → coups par trou, `null` tant que le trou n'est pas saisi. */
  scores: Record<string, (number | null)[]>
  /** Trou affiché à la reprise de la partie (1-indexé). */
  currentHole: number
  status: RoundStatus
}

/** Ligne de classement, commune à toutes les formules pour que l'écran de
 *  résultats reste générique. */
export interface LeaderboardRow {
  /** playerId, ou teamId pour les formules par équipes. */
  key: string
  label: string
  rank: number
  /** Valeur de tri, toujours « plus petit = meilleur » après normalisation. */
  sortValue: number
  /** Valeur principale affichée (« 78 », « 34 pts », « 2 up »). */
  display: string
  secondary?: string
  /** Score par rapport au par, quand la formule en a un : sert à colorer en rouge
   *  ce qui est sous le par, comme sur un classement de tournoi. */
  toPar?: number
  holesPlayed: number
}

export interface Team {
  id: string
  label: string
  playerIds: string[]
}
