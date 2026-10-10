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

## Version et mises à jour

Le numéro `majeur.mineur.release` s'affiche en bas de l'accueil. Majeur et mineur se
règlent à la main dans le champ `version` de `package.json` ; la release est le nombre de
commits et s'incrémente toute seule à chaque publication.

À chaque retour sur l'app, elle cherche une nouvelle version et, s'il y en a une, se
recharge toute seule (`src/main.tsx`). Sans cela, Android garde l'app en mémoire et elle
resterait sur l'ancienne version jusqu'à sa fermeture complète. Les données sont écrites à
chaque action : le rechargement n'en perd aucune.

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
- Le skins se joue **à partir de 2 joueurs**, jusqu'à 4. Le solde se règle à la fin de la
  partie ; celui affiché pendant la partie est provisoire.
- Le montant saisi est la **valeur du trou** : celui qui le remporte la touche, payée à
  parts égales par tous les autres joueurs (à 4, un trou à 3 € coûte 1 € à chacun des
  trois perdants).
- Celui qui réalise le meilleur score, **seul**, remporte la valeur du trou plus tout
  report accumulé.
- En cas d'égalité : report cumulé (par défaut), partage entre ex-aequo, ou trou annulé.
- Brut ou net au choix. En net, les coups rendus sont répartis selon le stroke index.
- Si le **dernier trou est lui-même égalisé**, le choix se fait avant le départ : les skins
  restants sont **perdus** (rien n'est dû, l'app affiche le montant à part), ou
  **partagés** entre les joueurs à égalité sur ce trou, payés par les autres. Le barrage
  n'est pas géré par l'app : il se joue sur le parcours, à vous de le régler.
- L'écran de résultats donne le bilan net de chacun (toujours à somme nulle) et le
  **règlement** : qui doit combien à qui, en un nombre minimal de virements.

## Parcours

- **Éditeur intégré** : nom, 9 ou 18 trous, par / stroke index / distance par trou,
  plusieurs séries de départ avec SSS et slope. Les stroke index sont validés (1 à N, sans
  doublon) car un SI faux fausse tout calcul en net.
- **Import en ligne** depuis [OpenStreetMap](https://www.openstreetmap.org/) (Nominatim pour
  trouver le club, Overpass pour lire ses trous) : sans compte ni clé, et la France y est
  couverte, contrairement aux bases commerciales testées (GolfCourseAPI ne contient aucun
  parcours français). Un parcours importé est copié localement.
  - Les données sont contributives et **inégales** : pars et stroke index manquent
    souvent. L'aperçu d'import liste ce qui manque ; les trous sans par reçoivent un par 4 par
    défaut, à corriger dans l'éditeur. Vérifie toujours les pars avant de jouer de l'argent.
  - Les serveurs publics Overpass sont parfois saturés : l'écran le dit et propose la
    saisie manuelle.
  - Code isolé dans `src/api/overpass.ts`. Données © contributeurs OpenStreetMap, ODbL.
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

## Stack technique

| Domaine | Choix |
|---|---|
| Langage | TypeScript 5.9 (mode strict) |
| Interface | React 18.3, React Router 6 (routage par hash) |
| Build | Vite 5.4 |
| Style | Tailwind CSS 3.4, couleurs en variables CSS (thèmes et styles), Barlow Condensed (`@fontsource`, embarquée) |
| État | Zustand 4.5 avec `persist` (localStorage), migrations dans `src/store/migrate.ts` |
| PWA | vite-plugin-pwa 0.20 + Workbox 7.1 (service worker, hors-ligne, mises à jour automatiques) |
| Tests | Vitest 2.1 (calculs, migrations, import OpenStreetMap) |
| Données de parcours | OpenStreetMap : Nominatim et Overpass |
| Hébergement | GitHub Pages, publié par GitHub Actions (tests, build, déploiement) |
| Runtime | Navigateur uniquement : pas de serveur, pas de compte, pas de base de données |

Les versions exactes sont dans `package.json` et `package-lock.json`.

## Architecture

```
src/domain/      moteurs de calcul, fonctions pures et testées
  handicap.ts      coups rendus par stroke index, handicap de jeu WHS
  skins.ts         valeur des trous, reports, bilan et règlement en euros
  strokeplay.ts  stableford.ts  matchplay.ts  scramble.ts  teams.ts
  course.ts        création et validation d'une carte de score
src/store/       état global Zustand persisté, migrations (migrate.ts)
src/api/         import de parcours depuis OpenStreetMap (overpass.ts)
src/screens/     les écrans
src/components/  composants partagés (bandeau, classement, icônes, filet d'erreur)
src/theme.ts     mode sombre / clair / système et style DP World Tour / PGA Tour
scripts/         générateur d'icônes PNG sans dépendance
.github/         workflow de publication sur GitHub Pages
```

Une partie fige une copie du parcours et des joueurs : modifier une carte de score ou
l'index d'un joueur plus tard ne réécrit pas l'historique.

## Note sur les dépendances

`workbox-build` et `workbox-window` sont épinglés en **7.1.0**. Les versions 7.3+ cassent
`vite-plugin-pwa` 0.20 (`Dynamic require of "workbox-build" is not supported`) et le
service worker n'est alors pas généré.
