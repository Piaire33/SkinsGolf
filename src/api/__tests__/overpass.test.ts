import { describe, expect, it } from 'vitest'
import { buildLoops, loopToCourse, parseRef, wayLength, type OsmHole, type OsmCourseSummary } from '../overpass'

const SUMMARY: OsmCourseSummary = {
  key: 'way/1',
  type: 'way',
  osmId: 1,
  name: 'Golf de Test',
  place: 'Pessac',
}

function hole(number: number, loop = '', par: number | null = 4, si: number | null = null): OsmHole {
  return { number, loop, par, si, meters: 350 }
}

describe('parseRef', () => {
  it('lit un numéro seul', () => {
    expect(parseRef('7')).toEqual({ loop: '', number: 7 })
  })

  it('sépare le parcours du numéro', () => {
    // Forme rencontrée au Golf de Gujan.
    expect(parseRef('18 trous - 2')).toEqual({ loop: '18 trous', number: 2 })
    expect(parseRef('9 trous - 1')).toEqual({ loop: '9 trous', number: 1 })
  })

  it('tolère les variantes de rédaction', () => {
    expect(parseRef('Trou 12')).toEqual({ loop: 'Trou', number: 12 })
    expect(parseRef('Les Vignes : 5')).toEqual({ loop: 'Les Vignes', number: 5 })
  })

  it('ne casse pas sur un ref absent ou non numérique', () => {
    expect(parseRef(undefined)).toEqual({ loop: '', number: null })
    expect(parseRef('practice')).toEqual({ loop: 'practice', number: null })
  })
})

describe('wayLength', () => {
  it('mesure un tracé en mètres', () => {
    // Un degré de latitude vaut environ 111 km ; 0,001° ≈ 111 m.
    const length = wayLength([
      { lat: 44.8, lon: -0.6 },
      { lat: 44.801, lon: -0.6 },
    ])
    expect(length).toBeGreaterThan(105)
    expect(length).toBeLessThan(118)
  })

  it('ne renvoie rien sans géométrie exploitable', () => {
    expect(wayLength(undefined)).toBeNull()
    expect(wayLength([{ lat: 44.8, lon: -0.6 }])).toBeNull()
  })
})

describe('buildLoops', () => {
  it('regroupe les trous d’un parcours unique', () => {
    const loops = buildLoops([hole(1), hole(3), hole(2)])
    expect(loops).toHaveLength(1)
    expect(loops[0].holes.map((h) => h.number)).toEqual([1, 2, 3])
    expect(loops[0].highest).toBe(3)
  })

  it('sépare les parcours annoncés par le ref', () => {
    const loops = buildLoops([
      hole(1, '18 trous'),
      hole(2, '18 trous'),
      hole(1, '9 trous'),
    ])
    expect(loops.map((l) => l.label).sort()).toEqual(['18 trous', '9 trous'])
  })

  it('scinde deux boucles qui partagent la même numérotation', () => {
    // Cas du Golf Bordeaux Lac : 36 trous numérotés 1 à 18 deux fois.
    const holes = [...Array(18)].flatMap((_, i) => [hole(i + 1), hole(i + 1)])
    const loops = buildLoops(holes)
    expect(loops).toHaveLength(2)
    expect(loops[0].holes).toHaveLength(18)
    expect(loops[1].holes).toHaveLength(18)
  })

  it('ignore les trous sans numéro', () => {
    expect(buildLoops([hole(0), hole(1)])[0].holes).toHaveLength(1)
  })

  it('place la boucle la plus complète en premier', () => {
    const loops = buildLoops([hole(1, 'A'), hole(1, 'B'), hole(2, 'B')])
    expect(loops[0].label).toBe('B')
  })
})

describe('loopToCourse', () => {
  const complete = [...Array(18)].map((_, i) => hole(i + 1, '', 4, i + 1))

  it('accepte une carte complète', () => {
    const { course, ready } = loopToCourse(SUMMARY, { label: 'P', holes: complete, highest: 18 }, false)
    expect(ready).toBe(true)
    expect(course.holeCount).toBe(18)
    expect(course.tees[0].holes.map((h) => h.si)).toEqual(complete.map((h) => h.si))
    expect(course.externalId).toBe('osm:way/1')
  })

  it('retombe sur 9 trous quand la numérotation s’arrête là', () => {
    const nine = [...Array(9)].map((_, i) => hole(i + 1, '', 4, i + 1))
    const { course } = loopToCourse(SUMMARY, { label: 'P', holes: nine, highest: 9 }, false)
    expect(course.holeCount).toBe(9)
  })

  it('refuse une série de stroke index incomplète et prévient', () => {
    // Cas d'UGOLF Villenave d'Ornon : pars présents, aucun index.
    const noSi = [...Array(18)].map((_, i) => hole(i + 1, '', 4, null))
    const { course, warnings, ready } = loopToCourse(
      SUMMARY,
      { label: 'P', holes: noSi, highest: 18 },
      false,
    )
    expect(ready).toBe(false)
    expect(warnings.some((w) => w.includes('stroke index'))).toBe(true)
    // La répartition de secours reste valide : 1 à 18 sans doublon.
    const sis = course.tees[0].holes.map((h) => h.si).sort((a, b) => a - b)
    expect(sis).toEqual([...Array(18)].map((_, i) => i + 1))
  })

  it('comble les trous absents et les énumère', () => {
    // Cas du Golf d'Arcachon : 13 trous cartographiés sur 18.
    const partial = [3, 4, 5, 6, 8, 9, 10, 13, 14, 15, 16, 17, 18].map((n) => hole(n, '', 4, n))
    const { course, warnings, ready } = loopToCourse(
      SUMMARY,
      { label: 'P', holes: partial, highest: 18 },
      false,
    )
    expect(ready).toBe(false)
    expect(course.tees[0].holes).toHaveLength(18)
    expect(warnings.some((w) => w.includes('1, 2, 7, 11, 12'))).toBe(true)
  })

  it('signale les pars manquants', () => {
    const noPar = [...Array(18)].map((_, i) => hole(i + 1, '', i === 4 ? null : 4, i + 1))
    const { warnings } = loopToCourse(SUMMARY, { label: 'P', holes: noPar, highest: 18 }, false)
    expect(warnings.some((w) => w.includes('Par manquant sur le(s) trou(s) 5'))).toBe(true)
  })

  it('prévient quand le site comporte plusieurs parcours', () => {
    const { course, warnings } = loopToCourse(
      SUMMARY,
      { label: 'Les Vignes', holes: complete, highest: 18 },
      true,
    )
    expect(course.courseName).toBe('Les Vignes')
    expect(course.externalId).toBe('osm:way/1#Les Vignes')
    expect(warnings.some((w) => w.includes('plusieurs parcours'))).toBe(true)
  })
})
