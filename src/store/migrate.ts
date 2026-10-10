/**
 * Migration des données enregistrées sur l'appareil.
 *
 * Les parcours, joueurs et parties vivent dans le stockage du navigateur, et
 * survivent à chaque mise à jour du code. Un seul cas peut les perdre : changer
 * la FORME des données sans migration. Zustand ignore alors ce qui est stocké
 * (« couldn't be migrated since no migrate function was provided ») puis écrase
 * le tout à la première écriture.
 *
 * Règle, à chaque changement de structure de `Course`, `Player`, `Round` ou du
 * store :
 *   1. incrémenter STORE_VERSION ;
 *   2. ajouter ici une étape qui transforme l'ancienne forme vers la nouvelle ;
 *   3. ajouter un test dans `__tests__/migrate.test.ts` avec une donnée de
 *      l'ancienne version.
 * Ne jamais supprimer une étape : un téléphone peut rester des mois sans ouvrir
 * l'app et arriver ici depuis n'importe quelle version.
 */
export const STORE_VERSION = 2

type Loose = Record<string, unknown>
const isObject = (value: unknown): value is Loose =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function migrateState(persisted: unknown, fromVersion: number): unknown {
  // Donnée illisible : on la rend telle quelle plutôt que de planter au
  // démarrage, ce qui interdirait tout accès à l'app.
  if (!isObject(persisted)) return persisted

  // v1 → v2 : le montant du skins n'est plus la mise de chaque joueur mais la
  // valeur du trou. Le nombre saisi est conservé sous son nouveau nom.
  if (fromVersion < 2 && Array.isArray(persisted.rounds)) {
    for (const round of persisted.rounds) {
      const skins = isObject(round) ? round.skins : undefined
      if (isObject(skins) && 'stakeByPar' in skins) {
        skins.valueByPar = skins.stakeByPar
        delete skins.stakeByPar
      }
    }
  }

  return persisted
}
