import { blankHoles, uid } from '@/domain/course'
import type { Course, Hole, HoleCount } from '@/domain/types'

/**
 * Import de parcours depuis OpenStreetMap, via l'API Overpass.
 *
 * Pourquoi OSM plutôt qu'une base commerciale : c'est la seule source gratuite
 * qui couvre réellement la France, sans clé ni quota, et dont le serveur
 * autorise les appels directs depuis un navigateur (`Access-Control-Allow-Origin: *`).
 *
 * En contrepartie les données sont contributives et inégales : un parcours peut
 * n'avoir que ses pars, ou rien du tout. L'import ne prétend donc pas livrer une
 * carte prête à jouer — il pré-remplit l'éditeur et signale précisément ce qui
 * manque. Les données sont sous licence ODbL : « © contributeurs OpenStreetMap ».
 */
/**
 * Seule instance Overpass retenue.
 *
 * Les miroirs publics ont été mesurés depuis un navigateur : kumi.systems et
 * private.coffee n'envoient pas d'en-tête CORS et échouent en 70 ms ;
 * maps.mail.ru renvoie 504 ; overpass.osm.ch répond vite mais n'héberge que la
 * Suisse. Les lister ne ferait qu'abréger les tentatives utiles.
 */
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

/** Rayon de recherche autour du lieu reconnu. */
const CITY_RADIUS_M = 20_000

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export type OsmErrorKind = 'network' | 'busy' | 'empty' | 'unknown'

export class OsmError extends Error {
  constructor(
    public kind: OsmErrorKind,
    message: string,
  ) {
    super(message)
  }
}

interface OverpassElement {
  type: 'way' | 'relation' | 'node'
  id: number
  tags?: Record<string, string>
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number }
  geometry?: { lat: number; lon: number }[]
  center?: { lat: number; lon: number }
}

export interface OsmCourseSummary {
  key: string
  type: 'way' | 'relation'
  osmId: number
  name: string
  place: string
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number }
}

export interface OsmHole {
  /** Numéro lu dans le tag `ref`. */
  number: number
  /** Étiquette du parcours quand le site en compte plusieurs (« 18 trous », « Les Vignes »). */
  loop: string
  par: number | null
  si: number | null
  meters: number | null
}

export interface OsmLoop {
  label: string
  holes: OsmHole[]
  /** Plus haut numéro de trou rencontré. */
  highest: number
}

const BUSY_MESSAGE =
  'Le serveur OpenStreetMap est saturé en ce moment. Réessaie dans une minute, ou saisis ' +
  'le parcours à la main.'

/**
 * Interroge Overpass, avec réessais espacés.
 *
 * L'instance publique n'accepte que deux requêtes simultanées et répond `429`
 * au-delà ; sous charge, elle renvoie aussi une page HTML d'erreur avec un code
 * 200, donc le statut HTTP ne suffit pas à juger du succès. Deux réessais
 * espacés suffisent en pratique à passer les pics.
 */
async function overpass(query: string): Promise<OverpassElement[]> {
  const url = `${OVERPASS_URL}?data=${encodeURIComponent(query)}`

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await wait(attempt * 4000)
    try {
      const response = await fetch(url)
      if (response.status === 429 || response.status === 504) continue
      if (!response.ok) continue
      const text = await response.text()
      if (!text.trimStart().startsWith('{')) continue
      return (JSON.parse(text).elements ?? []) as OverpassElement[]
    } catch {
      // Panne réseau ou requête bloquée : on retente.
    }
  }
  throw new OsmError('busy', BUSY_MESSAGE)
}

function toSummary(element: OverpassElement): OsmCourseSummary {
  const tags = element.tags ?? {}
  const place = [tags['addr:city'], tags['addr:postcode']].filter(Boolean).join(' ')
  return {
    key: `${element.type}/${element.id}`,
    type: element.type as 'way' | 'relation',
    osmId: element.id,
    name: tags.name || 'Golf sans nom',
    place,
    bounds: element.bounds,
  }
}

interface NominatimResult {
  osm_type?: 'way' | 'relation' | 'node'
  osm_id?: number
  class?: string
  type?: string
  display_name?: string
  name?: string
  lat: string
  lon: string
  /** [sud, nord, ouest, est] */
  boundingbox?: [string, string, string, string]
}

/**
 * Cherche un parcours à partir d'un nom de club ou d'une commune.
 *
 * Le géocodage Nominatim passe en premier : il indexe aussi bien les communes
 * que les golfs eux-mêmes, et répond en quelques centaines de millisecondes.
 * Chercher directement dans Overpass par expression régulière sur toute la
 * France demandait au contraire trente à soixante secondes et finissait souvent
 * en `429` — mesuré, pas supposé.
 *
 * Quand Nominatim reconnaît directement un golf, aucune requête Overpass n'est
 * nécessaire. Sinon on interroge Overpass autour du lieu trouvé, ce qui reste
 * une requête légère et bornée.
 */
export async function searchCourses(query: string): Promise<OsmCourseSummary[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const places = await geocode(trimmed)
  if (places.length === 0) return []

  const direct = places.filter((p) => p.class === 'leisure' && p.type === 'golf_course')
  if (direct.length > 0) return direct.map(nominatimToSummary)

  const { lat, lon } = places[0]
  const nearby = await overpass(
    `[out:json][timeout:60];` +
      `(way["leisure"="golf_course"](around:${CITY_RADIUS_M},${lat},${lon});` +
      `relation["leisure"="golf_course"](around:${CITY_RADIUS_M},${lat},${lon}););` +
      `out tags bb;`,
  )
  return nearby.map(toSummary)
}

function nominatimToSummary(result: NominatimResult): OsmCourseSummary {
  const [south, north, west, east] = result.boundingbox ?? []
  const parts = (result.display_name ?? '').split(',').map((s) => s.trim())
  return {
    key: `${result.osm_type}/${result.osm_id}`,
    type: (result.osm_type === 'relation' ? 'relation' : 'way') as 'way' | 'relation',
    osmId: result.osm_id ?? 0,
    name: result.name || parts[0] || 'Golf sans nom',
    // La commune est l'avant-dernier élément utile de l'adresse complète.
    place: parts.slice(1, 4).join(', '),
    bounds: result.boundingbox
      ? {
          minlat: Number(south),
          maxlat: Number(north),
          minlon: Number(west),
          maxlon: Number(east),
        }
      : undefined,
  }
}

async function geocode(query: string): Promise<NominatimResult[]> {
  try {
    const response = await fetch(
      `${NOMINATIM_URL}?format=json&limit=8&countrycodes=fr&q=${encodeURIComponent(query)}`,
    )
    if (!response.ok) return []
    return (await response.json()) as NominatimResult[]
  } catch {
    return []
  }
}

/* --------------------------- lecture des trous --------------------------- */

/** Le tag `ref` vaut « 7 », « Trou 7 » ou « 18 trous - 7 » selon les contributeurs :
 *  le numéro est le dernier entier, ce qui le précède identifie le parcours. */
export function parseRef(ref: string | undefined): { loop: string; number: number | null } {
  if (!ref) return { loop: '', number: null }
  const match = ref.match(/^(.*?)(\d+)\s*$/)
  if (!match) return { loop: ref.trim(), number: null }
  return {
    loop: match[1].replace(/[-–—:,.\s]+$/, '').trim(),
    number: Number(match[2]),
  }
}

const EARTH_RADIUS_M = 6_371_000

function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

/** Longueur du tracé départ → green, qui approche la longueur jouée du trou. */
export function wayLength(geometry: { lat: number; lon: number }[] | undefined): number | null {
  if (!geometry || geometry.length < 2) return null
  let total = 0
  for (let i = 1; i < geometry.length; i++) total += haversine(geometry[i - 1], geometry[i])
  return Math.round(total)
}

/** Test d'appartenance à un polygone par lancer de rayon. */
function inPolygon(
  point: { lat: number; lon: number },
  polygon: { lat: number; lon: number }[],
): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const { lat: yi, lon: xi } = polygon[i]
    const { lat: yj, lon: xj } = polygon[j]
    if (yi > point.lat !== yj > point.lat) {
      if (point.lon < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi) inside = !inside
    }
  }
  return inside
}

function midpoint(geometry: { lat: number; lon: number }[]): { lat: number; lon: number } {
  return geometry[Math.floor(geometry.length / 2)]
}

/**
 * Récupère les trous d'un parcours.
 *
 * On interroge la zone englobante puis on filtre localement par appartenance au
 * polygone : l'indexation par aire d'Overpass ne couvre pas les contours de golf,
 * et deux clubs voisins se chevauchent souvent dans une même zone.
 */
export async function fetchHoles(summary: OsmCourseSummary): Promise<OsmHole[]> {
  const b = summary.bounds
  if (!b) throw new OsmError('empty', "Ce parcours n'a pas de contour cartographié.")

  const elements = await overpass(
    `[out:json][timeout:90];` +
      `${summary.type}(${summary.osmId});out geom;` +
      `way["golf"="hole"](${b.minlat},${b.minlon},${b.maxlat},${b.maxlon});out tags geom;`,
  )

  const outline = elements.find(
    (e) => e.id === summary.osmId && e.type === summary.type,
  )?.geometry
  const rawHoles = elements.filter((e) => e.tags?.golf === 'hole' && e.geometry)

  const kept = outline
    ? rawHoles.filter((h) => inPolygon(midpoint(h.geometry!), outline))
    : rawHoles

  return kept.map((element) => {
    const tags = element.tags ?? {}
    const { loop, number } = parseRef(tags.ref)
    const par = Number(tags.par)
    const si = Number(tags.handicap)
    return {
      number: number ?? 0,
      loop,
      par: par >= 3 && par <= 6 ? par : null,
      si: si >= 1 && si <= 18 ? si : null,
      meters: wayLength(element.geometry),
    }
  })
}

/* ------------------------- découpage en parcours ------------------------- */

/**
 * Sépare les trous en boucles jouables.
 *
 * Un même site accueille souvent plusieurs parcours. Quand les contributeurs
 * les distinguent (« 18 trous - 7 », « 9 trous - 3 »), on s'appuie sur ce
 * préfixe. Quand ils ne le font pas, les numéros se répètent : la n-ième
 * occurrence d'un numéro est affectée à la n-ième boucle, ce qui est une
 * heuristique — l'ordre renvoyé par Overpass n'a rien de géographique. D'où
 * l'avertissement remonté à l'utilisateur dans ce cas.
 */
export function buildLoops(holes: OsmHole[]): OsmLoop[] {
  const numbered = holes.filter((h) => h.number > 0)
  const byLabel = new Map<string, OsmHole[]>()
  for (const hole of numbered) {
    byLabel.set(hole.loop, [...(byLabel.get(hole.loop) ?? []), hole])
  }

  const loops: OsmLoop[] = []
  for (const [label, group] of byLabel) {
    const seen = new Map<number, number>()
    const split: OsmHole[][] = []
    for (const hole of group) {
      const rank = seen.get(hole.number) ?? 0
      seen.set(hole.number, rank + 1)
      ;(split[rank] ??= []).push(hole)
    }
    split.forEach((subset, index) => {
      const sorted = [...subset].sort((a, b) => a.number - b.number)
      loops.push({
        label: split.length > 1 ? `${label || 'Parcours'} ${index + 1}` : label || 'Parcours',
        holes: sorted,
        highest: Math.max(...sorted.map((h) => h.number)),
      })
    })
  }

  // Les boucles les plus fournies d'abord : c'est le parcours principal.
  return loops.sort((a, b) => b.holes.length - a.holes.length)
}

export interface ConversionResult {
  course: Course
  /** Ce que l'utilisateur doit vérifier ou compléter avant de jouer. */
  warnings: string[]
  /** Vrai si la carte est utilisable telle quelle en net. */
  ready: boolean
}

/** Construit une carte de score à partir d'une boucle, en comblant les manques. */
export function loopToCourse(
  summary: OsmCourseSummary,
  loop: OsmLoop,
  multipleLoops: boolean,
): ConversionResult {
  const holeCount: HoleCount = loop.highest > 9 ? 18 : 9
  const warnings: string[] = []

  const byNumber = new Map(loop.holes.map((h) => [h.number, h]))
  const missing: number[] = []
  const noPar: number[] = []

  const holes: Hole[] = Array.from({ length: holeCount }, (_, i) => {
    const number = i + 1
    const source = byNumber.get(number)
    if (!source) {
      missing.push(number)
      return { number, par: 4, si: number }
    }
    if (source.par === null) noPar.push(number)
    return {
      number,
      par: source.par ?? 4,
      si: source.si ?? number,
      ...(source.meters ? { meters: source.meters } : {}),
    }
  })

  // Les coups rendus se répartissent par stroke index : une série incomplète ou
  // en doublon fausserait tout le net et tout le skins net.
  const sis = holes.map((h) => h.si)
  const siValid =
    loop.holes.every((h) => h.si !== null) &&
    new Set(sis).size === holeCount &&
    Math.min(...sis) === 1 &&
    Math.max(...sis) === holeCount

  if (!siValid) {
    blankHoles(holeCount).forEach((fallback, i) => {
      holes[i].si = fallback.si
    })
    warnings.push(
      'Aucun stroke index exploitable dans OpenStreetMap : une répartition par défaut a été ' +
        'posée. Corrige-la avant de jouer en net ou en skins net, sinon les coups rendus ' +
        'tomberont sur les mauvais trous.',
    )
  }

  if (missing.length > 0) {
    warnings.push(
      `${missing.length} trou(s) absent(s) de la cartographie (n° ${missing.join(', ')}) : ` +
        'par 4 par défaut, à corriger.',
    )
  }
  if (noPar.length > 0) {
    warnings.push(`Par manquant sur le(s) trou(s) ${noPar.join(', ')} : par 4 par défaut.`)
  }
  if (multipleLoops) {
    warnings.push(
      'Ce site comporte plusieurs parcours qu\'OpenStreetMap ne distingue pas clairement. ' +
        'Vérifie que les trous récupérés sont bien ceux du parcours que tu veux.',
    )
  }
  warnings.push(
    'Distances mesurées sur le tracé départ → green : elles approchent la longueur jouée ' +
      'sans la valoir exactement.',
  )
  warnings.push(
    'Rating et slope ne figurent pas dans OpenStreetMap. Ajoute-les pour un handicap de jeu ' +
      'calculé à la norme WHS ; sans eux, l\'index des joueurs est utilisé tel quel.',
  )

  const course: Course = {
    id: uid(),
    clubName: summary.name,
    courseName: multipleLoops ? loop.label : '',
    holeCount,
    source: 'api',
    externalId: `osm:${summary.key}${multipleLoops ? `#${loop.label}` : ''}`,
    updatedAt: new Date().toISOString(),
    tees: [{ id: uid(), name: 'Jaune', holes }],
  }

  return { course, warnings, ready: siValid && missing.length === 0 && noPar.length === 0 }
}
