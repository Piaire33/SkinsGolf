import { roundHoles, playingHandicaps, strokesReceived } from './handicap'
import type { Round } from './types'

/** `0` dans une carte de score = balle ramassée : le joueur n'a pas rentré le
 *  trou, il ne peut donc pas gagner le skin, mais le trou peut être attribué
 *  aux autres. `null` = trou pas encore saisi. */
export const PICKED_UP = 0

export type SkinsHoleStatus =
  /** un seul meilleur score : le trou est remporté */
  | 'won'
  /** égalité : la valeur est reportée sur le trou suivant */
  | 'carried'
  /** égalité, valeur partagée entre les ex-aequo */
  | 'split'
  /** égalité, rien n'est joué (règle « trou annulé », ou tout le monde à égalité) */
  | 'void'
  /** tous les scores ne sont pas encore saisis */
  | 'pending'

export interface SkinsHoleResult {
  hole: number
  par: number
  /** Valeur du trou, selon son par. */
  value: number
  /** Report venant des trous précédents. */
  carriedIn: number
  /** Total que touche le vainqueur : valeur du trou + report. */
  inPlay: number
  /** Report transmis au trou suivant. */
  carriedOut: number
  winnerIds: string[]
  /** Meilleur score retenu (net ou brut selon la config), `null` si indécidable. */
  bestScore: number | null
  /** playerId → score retenu pour la comparaison. */
  effectiveScores: Record<string, number | null>
  status: SkinsHoleStatus
}

export interface Transfer {
  from: string
  to: string
  amount: number
}

export interface SkinsResult {
  holes: SkinsHoleResult[]
  /** Euros encaissés par joueur sur les trous qu'il a remportés. */
  gains: Record<string, number>
  /** Euros payés par joueur aux vainqueurs des trous qu'il a perdus. */
  paid: Record<string, number>
  /** gains − payé. La somme des nets vaut toujours 0. */
  net: Record<string, number>
  /** Nombre de trous remportés (un partage compte 1 pour chaque ex-aequo). */
  skinsWon: Record<string, number>
  /** Report resté en jeu à la fin : des égalités jusqu'au dernier trou que
   *  personne n'a remportées. Rien n'est dû, c'est à rejouer en playoff. */
  unresolvedPot: number
  /** Qui doit combien à qui, en un nombre minimal de virements. */
  settlement: Transfer[]
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function valueForPar(round: Round, par: number): number {
  return round.skins.valueByPar[par] ?? 0
}

/**
 * Calcule l'intégralité du skins game de la partie.
 *
 * Chaque trou vaut `valueByPar[par]` euros. Celui qui réalise le meilleur score,
 * seul, remporte cette valeur, plus tout report accumulé : elle lui est payée à
 * parts égales par les autres joueurs. En cas d'égalité la valeur est reportée
 * sur le trou suivant (règle par défaut), partagée, ou annulée.
 *
 * Fonctionne aussi en cours de partie : les trous non saisis sont `pending` et
 * ne font rien payer à personne.
 */
export function computeSkins(round: Round): SkinsResult {
  const holes = roundHoles(round)
  const holeCount = holes.length
  const playerIds = round.participants.map((p) => p.playerId)
  const hcps = playingHandicaps(round)

  const gains: Record<string, number> = {}
  const paid: Record<string, number> = {}
  const skinsWon: Record<string, number> = {}
  for (const id of playerIds) {
    gains[id] = 0
    paid[id] = 0
    skinsWon[id] = 0
  }

  /** Les `winners` se partagent `amount`, financé à parts égales par les autres. */
  function pay(winners: string[], amount: number): boolean {
    const payers = playerIds.filter((id) => !winners.includes(id))
    // Tout le monde à égalité, ou un seul joueur : personne ne peut payer.
    if (winners.length === 0 || payers.length === 0) return false
    const eachWinner = amount / winners.length
    const eachPayer = amount / payers.length
    for (const id of winners) {
      gains[id] = round2(gains[id] + eachWinner)
      skinsWon[id] += 1
    }
    for (const id of payers) paid[id] = round2(paid[id] + eachPayer)
    return true
  }

  const results: SkinsHoleResult[] = []
  let carry = 0
  let lastHoleWinners: string[] = []

  for (let i = 0; i < holeCount; i++) {
    const hole = holes[i]
    const value = valueForPar(round, hole.par)
    const carriedIn = carry
    const inPlay = round2(value + carriedIn)

    const effectiveScores: Record<string, number | null> = {}
    let anyMissing = false
    let best: number | null = null
    let winners: string[] = []

    for (const id of playerIds) {
      const gross = round.scores[id]?.[i] ?? null
      if (gross === null) {
        anyMissing = true
        effectiveScores[id] = null
        continue
      }
      if (gross === PICKED_UP) {
        // Balle ramassée : score connu mais hors concours sur ce trou.
        effectiveScores[id] = null
        continue
      }
      const given = round.skins.net ? strokesReceived(hcps[id] ?? 0, hole.si, holeCount) : 0
      const effective = gross - given
      effectiveScores[id] = effective
      if (best === null || effective < best) {
        best = effective
        winners = [id]
      } else if (effective === best) {
        winners.push(id)
      }
    }

    let status: SkinsHoleStatus
    let carriedOut = 0

    if (anyMissing || best === null) {
      status = 'pending'
      carriedOut = inPlay
    } else if (winners.length === 1) {
      status = pay(winners, inPlay) ? 'won' : 'void'
    } else if (round.skins.tieRule === 'split') {
      status = pay(winners, inPlay) ? 'split' : 'void'
    } else if (round.skins.tieRule === 'void') {
      status = 'void'
    } else {
      status = 'carried'
      carriedOut = inPlay
    }

    carry = carriedOut
    if (i === holeCount - 1) lastHoleWinners = winners
    results.push({
      hole: hole.number,
      par: hole.par,
      value,
      carriedIn,
      inPlay,
      carriedOut,
      winnerIds: status === 'won' || status === 'split' ? winners : [],
      bestScore: best,
      effectiveScores,
      status,
    })
  }

  // Dernier trou égalisé : ce qui reste en jeu est perdu, ou partagé entre les
  // joueurs à égalité sur ce trou, selon la règle choisie avant le départ.
  const last = results[results.length - 1]
  if (round.skins.endRule === 'split' && last?.status === 'carried' && pay(lastHoleWinners, last.carriedOut)) {
    last.status = 'split'
    last.winnerIds = lastHoleWinners
    last.carriedOut = 0
  }

  // Le report que personne n'a remporté : les égalités qui suivent le dernier
  // trou attribué. Les trous non saisis n'en font pas partie, ils sont à jouer.
  let lastDecided = -1
  results.forEach((r, i) => {
    if (r.status === 'won' || r.status === 'split') lastDecided = i
  })
  const unresolvedPot = round2(
    results.reduce(
      (sum, r, i) => (i > lastDecided && r.status === 'carried' ? sum + r.value : sum),
      0,
    ),
  )

  const net: Record<string, number> = {}
  for (const id of playerIds) net[id] = round2(gains[id] - paid[id])

  return { holes: results, gains, paid, net, skinsWon, unresolvedPot, settlement: settle(net) }
}

/**
 * Transforme un bilan net en liste de virements, en minimisant leur nombre :
 * on fait toujours payer le plus gros débiteur au plus gros créditeur.
 */
export function settle(net: Record<string, number>): Transfer[] {
  const debtors = Object.entries(net)
    .filter(([, v]) => v < -0.004)
    .map(([id, v]) => ({ id, amount: -v }))
    .sort((a, b) => b.amount - a.amount)
  const creditors = Object.entries(net)
    .filter(([, v]) => v > 0.004)
    .map(([id, v]) => ({ id, amount: v }))
    .sort((a, b) => b.amount - a.amount)

  const transfers: Transfer[] = []
  let d = 0
  let c = 0
  while (d < debtors.length && c < creditors.length) {
    const amount = round2(Math.min(debtors[d].amount, creditors[c].amount))
    if (amount > 0) {
      transfers.push({ from: debtors[d].id, to: creditors[c].id, amount })
    }
    debtors[d].amount = round2(debtors[d].amount - amount)
    creditors[c].amount = round2(creditors[c].amount - amount)
    if (debtors[d].amount <= 0.004) d++
    if (creditors[c].amount <= 0.004) c++
  }
  return transfers
}
