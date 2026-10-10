import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Screen } from '@/components/ui'
import { SearchIcon } from '@/components/icons'
import { useStore } from '@/store/useStore'
import { totalPar } from '@/domain/handicap'
import {
  OsmError,
  buildLoops,
  fetchHoles,
  loopToCourse,
  searchCourses,
  type ConversionResult,
  type OsmCourseSummary,
  type OsmLoop,
} from '@/api/overpass'

type Stage =
  | { kind: 'idle' }
  | { kind: 'searching' }
  | { kind: 'results'; results: OsmCourseSummary[] }
  | { kind: 'loading'; summary: OsmCourseSummary }
  | { kind: 'loops'; summary: OsmCourseSummary; loops: OsmLoop[] }
  | { kind: 'preview'; summary: OsmCourseSummary; result: ConversionResult }

export default function CourseImport() {
  const navigate = useNavigate()
  const upsertCourse = useStore((s) => s.upsertCourse)
  const courses = useStore((s) => s.courses)

  const [query, setQuery] = useState('')
  const [stage, setStage] = useState<Stage>({ kind: 'idle' })
  const [error, setError] = useState<string | null>(null)

  async function search() {
    if (!query.trim()) return
    setError(null)
    setStage({ kind: 'searching' })
    try {
      setStage({ kind: 'results', results: await searchCourses(query) })
    } catch (e) {
      setError((e as OsmError).message)
      setStage({ kind: 'idle' })
    }
  }

  async function openCourse(summary: OsmCourseSummary) {
    setError(null)
    setStage({ kind: 'loading', summary })
    try {
      const loops = buildLoops(await fetchHoles(summary))
      if (loops.length === 0) {
        setError(
          `Aucun trou n'est cartographié pour « ${summary.name} ». Le contour du golf existe, ` +
            "mais personne n'a encore tracé ses trous. Saisis la carte à la main.",
        )
        setStage({ kind: 'idle' })
        return
      }
      // Un seul parcours sur le site : inutile de faire choisir.
      if (loops.length === 1) {
        setStage({ kind: 'preview', summary, result: loopToCourse(summary, loops[0], false) })
        return
      }
      setStage({ kind: 'loops', summary, loops })
    } catch (e) {
      setError((e as OsmError).message)
      setStage({ kind: 'idle' })
    }
  }

  function confirmImport(result: ConversionResult) {
    const duplicate = courses.find((c) => c.externalId === result.course.externalId)
    if (duplicate && !confirm(`« ${duplicate.clubName} » est déjà enregistré. L'importer à nouveau ?`)) {
      return
    }
    upsertCourse(result.course)
    navigate(`/courses/${result.course.id}`)
  }

  const showSearch = stage.kind !== 'preview' && stage.kind !== 'loops'

  return (
    <Screen title="Chercher un parcours" subtitle="OpenStreetMap" back="/courses">
      {showSearch && (
        <>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void search()
            }}
          >
            <input
              className="field flex-1"
              placeholder="Nom du club ou ville…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="submit"
              disabled={stage.kind === 'searching' || !query.trim()}
              className="btn-primary px-4"
            >
              <SearchIcon />
            </button>
          </form>
          <p className="text-xs text-veil/40 px-1">
            Recherche sur toute la France, par nom de club puis par ville.
          </p>
        </>
      )}

      {(stage.kind === 'searching' || stage.kind === 'loading') && (
        <p className="text-sm text-veil/50 px-1">
          {stage.kind === 'searching' ? 'Recherche…' : `Lecture des trous de ${stage.summary.name}…`}
        </p>
      )}

      {error && (
        <div className="card border-warn-line bg-warn-soft space-y-2">
          <p className="text-sm text-warn-ink">{error}</p>
          <Link to="/courses" className="btn-ghost w-full text-sm">
            Saisir le parcours à la main
          </Link>
        </div>
      )}

      {stage.kind === 'results' && stage.results.length === 0 && (
        <div className="card space-y-2">
          <p className="text-sm text-veil/70">Aucun golf trouvé pour « {query} ».</p>
          <p className="text-xs text-veil/40">
            Essaie le nom de la commune, ou une orthographe différente.
          </p>
        </div>
      )}

      {stage.kind === 'results' &&
        stage.results.map((summary) => (
          <button
            key={summary.key}
            onClick={() => void openCourse(summary)}
            className="card w-full text-left hover:border-accent transition"
          >
            <div className="font-semibold">{summary.name}</div>
            <div className="text-xs text-veil/40">{summary.place || 'France'}</div>
          </button>
        ))}

      {stage.kind === 'loops' && (
        <>
          <div className="card">
            <div className="font-semibold">{stage.summary.name}</div>
            <p className="text-sm text-veil/60 mt-1">
              {stage.loops.length} parcours distincts sur ce site. Lequel veux-tu importer ?
            </p>
          </div>
          {stage.loops.map((loop) => (
            <button
              key={loop.label}
              onClick={() =>
                setStage({
                  kind: 'preview',
                  summary: stage.summary,
                  result: loopToCourse(stage.summary, loop, true),
                })
              }
              className="card w-full text-left hover:border-accent transition"
            >
              <div className="font-semibold">{loop.label}</div>
              <div className="text-xs text-veil/40">
                {loop.holes.length} trous cartographiés · numérotés jusqu'à {loop.highest}
              </div>
            </button>
          ))}
        </>
      )}

      {stage.kind === 'preview' && (
        <Preview
          result={stage.result}
          onCancel={() => setStage({ kind: 'idle' })}
          onConfirm={() => confirmImport(stage.result)}
        />
      )}

      <p className="text-[11px] text-veil/30 px-1 pt-2">
        Données cartographiques © les contributeurs OpenStreetMap, sous licence ODbL.
      </p>
    </Screen>
  )
}

function Preview({
  result,
  onCancel,
  onConfirm,
}: {
  result: ConversionResult
  onCancel: () => void
  onConfirm: () => void
}) {
  const { course, warnings, ready } = result
  const holes = course.tees[0].holes

  return (
    <>
      <div className="card space-y-3">
        <div>
          <div className="font-semibold">{course.clubName}</div>
          {course.courseName && <div className="text-sm text-veil/60">{course.courseName}</div>}
          <div className="text-sm text-veil/50 mt-1">
            {course.holeCount} trous · par {totalPar(holes)}
          </div>
        </div>

        <div
          className={`rounded-xl px-3 py-2 text-sm ${
            ready ? 'bg-accent-soft text-accent-ink' : 'bg-warn-soft text-warn-ink'
          }`}
        >
          {ready
            ? 'Carte complète : pars et stroke index exploitables tels quels.'
            : 'Carte incomplète — à compléter dans l’éditeur avant de jouer.'}
        </div>

        <div className="overflow-x-auto -mx-1 px-1">
          <table className="text-xs border-separate border-spacing-x-0.5 border-spacing-y-1">
            <tbody>
              <Row label="Trou" values={holes.map((h) => String(h.number))} />
              <Row label="Par" values={holes.map((h) => String(h.par))} />
              <Row label="SI" values={holes.map((h) => String(h.si))} />
              <Row label="Mètres" values={holes.map((h) => (h.meters ? String(h.meters) : '–'))} />
            </tbody>
          </table>
        </div>
      </div>

      <div className="card space-y-2">
        <span className="label mb-0">À vérifier</span>
        <ul className="space-y-1.5">
          {warnings.map((warning) => (
            <li key={warning} className="text-xs text-veil/60 flex gap-1.5">
              <span className="text-warn-ink shrink-0">•</span>
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={onCancel} className="btn-ghost">
          Annuler
        </button>
        <button onClick={onConfirm} className="btn-primary">
          Importer et éditer
        </button>
      </div>
    </>
  )
}

function Row({ label, values }: { label: string; values: string[] }) {
  return (
    <tr>
      <th className="sticky left-0 bg-surface pr-2 text-left font-medium text-veil/40 whitespace-nowrap">
        {label}
      </th>
      {values.map((value, i) => (
        <td key={i} className="text-center tabular-nums min-w-[1.6rem]">
          {value}
        </td>
      ))}
    </tr>
  )
}
