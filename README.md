# SkinsGolf

Application mobile (PWA) de saisie de scores de golf pour 1 à 4 joueurs, avec calcul du
**skins game** en euros. Fonctionne entièrement hors-ligne : aucun réseau n'est nécessaire
pendant une partie.

## Installer sur le téléphone

Une PWA ne s'installe réellement (icône, plein écran, hors-ligne) que depuis une adresse
**HTTPS à certificat valide**. Un certificat auto-signé suffit pour *ouvrir* l'app, mais
Chrome refuse alors d'enregistrer le service worker : pas de mode hors-ligne fiable, et
« Ajouter à l'écran d'accueil » ne crée qu'un simple raccourci.

**Méthode recommandée : l'héberger (gratuit).**

```bash
npm install
npm run icons    # une seule fois
npm run build    # produit le dossier dist/
```

Dépose ensuite `dist/` sur un hébergeur statique : Netlify (glisser-déposer sur
app.netlify.com/drop), Cloudflare Pages, Vercel ou GitHub Pages. `base: './'` et le routage
par hash sont déjà configurés : aucune règle de réécriture n'est nécessaire, même dans un
sous-dossier. Sur le téléphone, ouvre l'adresse obtenue dans **Chrome**, puis
**menu ⋮ → Installer l'application**.

**Pour un simple essai sur le Wi-Fi.** `npm run preview:lan` sert l'app sur
`https://192.168.x.x:4173` (même réseau que le PC, avertissement de certificat à accepter).
Pratique pour juger l'affichage ; pas pour l'usage au golf.

> Les données sont stockées **par adresse** : ce que tu saisis sur une adresse d'essai
> n'existe pas sur l'adresse définitive. Utilise *Réglages → Exporter une sauvegarde* avant
> de changer d'adresse.

## Développement

```bash
npm run dev        # serveur de développement
npm run dev:lan    # idem, en HTTPS sur le réseau local
npm test           # tests des moteurs de calcul
npm run build      # vérification TypeScript + bundle de production
```

## Formules de jeu

| Formule | Détail |
|---|---|
| Stroke play | total des coups, brut ou net |
| Stableford | 2 points pour le par net, ±1 par coup, plancher à 0 |
| Match play | trou par trou, deux camps (simple ou 2v2), score « 3&2 », dormie, all square |
| Scramble / Best-ball | meilleur score de l'équipe sur chaque trou |
| **Skins game** | jouable **en parallèle** de n'importe quelle formule ci-dessus |

### Règles du skins

- Le prix d'un trou se saisit **par par**, en euros. Par défaut : **1 € sur un par 3, 2 €
  sur un par 4, 3 € sur un par 5** — modifiable au lancement de chaque partie.
- Le skins est un **duel à deux joueurs** : l'option se désactive si la partie n'a pas
  exactement 2 joueurs. Le solde se règle à la fin de la partie.
- Le montant saisi est la **valeur du trou** : celui qui le remporte la touche de son
  adversaire. Le solde affiché pendant la partie est provisoire.
- Celui qui réalise le meilleur score, **seul**, remporte la valeur du trou plus tout
  report accumulé.
- En cas d'égalité : report cumulé (par défaut), partage entre ex-aequo, ou trou annulé.
- Brut ou net au choix. En net, les coups rendus sont répartis selon le stroke index.
- Le report resté en jeu au dernier trou n'est attribué à personne : rien n'est dû, et
  l'app l'affiche séparément (à rejouer en playoff).
- L'écran de résultats donne le bilan net de chacun (toujours à somme nulle) et le
  **règlement** : qui doit combien à qui, en un nombre minimal de virements.

## Parcours

- **Éditeur intégré** : nom, 9 ou 18 trous, par / stroke index / distance par trou,
  plusieurs séries de départ avec SSS et slope. Les stroke index sont validés (1 à N, sans
  doublon) car un SI faux fausse tout calcul en net.
- **Import en ligne** via [GolfCourseAPI](https://golfcourseapi.com/) : clé gratuite
  (35 requêtes/jour), à coller dans *Réglages*. Un parcours importé est copié localement et
  n'est plus jamais retéléchargé.
  - La base est très orientée États-Unis : beaucoup de clubs français en sont absents.
  - L'API ne documente pas sa politique CORS. Si le navigateur bloque l'appel, l'écran le
    dit et renvoie vers la saisie manuelle. Le code d'import est isolé dans
    `src/api/golfCourseApi.ts` : router `BASE_URL` vers une fonction serverless relais
    suffirait à le débloquer après déploiement.
- **Import / export JSON** pour sauvegarder ou partager une carte de score.

## Charte graphique

Deux styles au choix dans *Réglages → Style*, indépendants du mode clair/sombre :

- **DP World Tour** (par défaut) : bandeau bleu marine et boutons cobalt.
- **PGA Tour** : bandeau marine plus profond et rouge en couleur d'action.

Dans les deux : chiffres condensés gras (Barlow Condensed, embarquée pour le hors-ligne)
et conventions des classements de tournoi — score par rapport au par (`E`, `-3`, `+2`),
rouge sous le par, colonnes POS / JOUEUR / TOT / THRU. La carte de score note les trous à
la manière télévisée : cercle sous le par, double cercle pour un eagle, carré au-dessus,
double carré pour un double bogey. Au-delà de 9 trous elle se lit sur deux lignes, aller
puis retour. Les teintes approchent ces identités sans reprendre de logo ni de marque.

## Thème

*Réglages → Apparence* : **Sombre**, **Clair** ou **Système** (suit le réglage du
téléphone, y compris ses bascules jour/nuit). Le choix est enregistré et appliqué avant le
premier rendu par un script en tête de `index.html`, afin d'éviter un flash blanc au
lancement depuis l'écran d'accueil.

Les couleurs sont des **variables CSS** déclarées en deux jeux dans `src/index.css` et
exposées à Tailwind comme jetons sémantiques (`surface`, `veil`, `accent-ink`, `warn-soft`…)
dans `tailwind.config.js`. Les composants ne nomment jamais une couleur littérale : ajouter
un thème revient à ajouter un bloc de variables.

## Architecture

```
src/domain/      moteurs de calcul, fonctions pures et testées (41 tests)
  handicap.ts      coups rendus par stroke index, handicap de jeu WHS
  skins.ts         pots, reports, bilan et règlement en euros
  strokeplay.ts  stableford.ts  matchplay.ts  scramble.ts  teams.ts
  course.ts        création et validation d'une carte de score
src/theme.ts     application du thème sombre / clair / système
src/store/       état global Zustand, persisté dans localStorage
src/screens/     les écrans
src/api/         client GolfCourseAPI
scripts/         générateur d'icônes PNG sans dépendance
```

Une partie fige une copie du parcours et des joueurs : modifier une carte de score ou
l'index d'un joueur plus tard ne réécrit pas l'historique.

## Note sur les dépendances

`workbox-build` et `workbox-window` sont épinglés en **7.1.0**. Les versions 7.3+ cassent
`vite-plugin-pwa` 0.20 (`Dynamic require of "workbox-build" is not supported`) et le
service worker n'est alors pas généré.
