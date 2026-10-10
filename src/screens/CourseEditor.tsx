import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Screen, SegmentedControl } from '@/components/ui'
import { PlusIcon, TrashIcon } from '@/components/icons'
import { useStore } from '@/store/useStore'
import { blankHoles, courseLabel, uid, validateCourse } from '@/domain/course'
import { totalPar } from '@/domain/handicap'
import type { Course, Hole, HoleCount, Tee } from '@/domain/types'

export default function CourseEditor() {
  const { id } = useParams()
  const stored = useStore((s) => s.courses.find((c) => c.id === id))

  if (!stored) {
    return (
      <Screen title="Parcours introuvable" back="/courses">
        <p className="text-veil/60">Ce parcours a été supprimé.</p>
      </Screen>
    )
  }
  // `key` force la réinitialisation du brouillon si on change de parcours sans
  // démonter l'écran.
  return <Editor key={stored.id} initial={stored} />
}

function Editor({ initial }: { initial: Course }) {
  const navigate = useNavigate()
  const upsertCourse = useStore((s) => s.upsertCourse)
  const deleteCourse = useStore((s) => s.deleteCourse)

  const [draft, setDraft] = useState<Course>(initial)
  const [teeIndex, setTeeIndex] = useState(0)

  // Sauvegarde automatique : chaque modification est écrite dans le stockage de
  // l'appareil au fil de la saisie, sans attendre un clic. Une carte incomplète
  // est donc conservée telle quelle et reprise plus tard ; c'est le lancement
  // d'une partie qui exige une carte valide, pas son enregistrement.
  useEffect(() => {
    if (draft !== initial) upsertCourse(draft)
  }, [draft, initial, upsertCourse])

  const tee = draft.tees[Math.min(teeIndex, draft.tees.length - 1)]
  const errors = validateCourse(draft)

  function patch(changes: Partial<Course>) {
    setDraft((d) => ({ ...d, ...changes }))
  }

  function patchTee(changes: Partial<Tee>) {
    setDraft((d) => ({
      ...d,
      tees: d.tees.map((t, i) => (i === teeIndex ? { ...t, ...changes } : t)),
    }))
  }

  function patchHole(holeIndex: number, changes: Partial<Hole>) {
    patchTee({ holes: tee.holes.map((h, i) => (i === holeIndex ? { ...h, ...changes } : h)) })
  }

  function changeHoleCount(holeCount: HoleCount) {
    if (holeCount === draft.holeCount) return
    const ok = confirm(
      `Passer à ${holeCount} trous réinitialise les pars et les stroke index de toutes les séries. Continuer ?`,
    )
    if (!ok) return
    patch({
      holeCount,
      tees: draft.tees.map((t) => ({ ...t, holes: blankHoles(holeCount) })),
    })
  }

  function addTee() {
    // On duplique la série courante : les pars et stroke index sont identiques
    // d'une série à l'autre, seules les distances changent.
    const copy: Tee = {
      ...tee,
      id: uid(),
      name: 'Nouvelle série',
      holes: tee.holes.map((h) => ({ ...h })),
    }
    patch({ tees: [...draft.tees, copy] })
    setTeeIndex(draft.tees.length)
  }

  function removeTee() {
    if (draft.tees.length <= 1) return
    if (!confirm(`Supprimer la série « ${tee.name} » ?`)) return
    patch({ tees: draft.tees.filter((_, i) => i !== teeIndex) })
    setTeeIndex(0)
  }

  function done() {
    navigate('/courses')
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(draft.clubName || 'parcours').replace(/[^\w-]+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Screen
      title={draft.clubName || 'Nouveau parcours'}
      subtitle={`${draft.holeCount} trous · par ${totalPar(tee.holes)}`}
      back="/courses"
      footer={
        <div className="space-y-2">
          {errors.length > 0 && (
            <ul className="text-xs text-warn-ink space-y-0.5 max-h-24 overflow-y-auto">
              {errors.length > 0 && <li className="font-medium">À corriger avant de jouer sur ce parcours :</li>}
              {errors.map((e) => (
                <li key={e}>• {e}</li>
              ))}
            </ul>
          )}
          <p className="text-xs text-veil/40 text-center">
            Les modifications sont enregistrées automatiquement.
          </p>
          <button onClick={done} className="btn-primary w-full">
            Terminé
          </button>
        </div>
      }
    >
      <div className="card space-y-3">
        <div>
          <label className="label">Club</label>
          <input
            className="field"
            value={draft.clubName}
            placeholder="Golf de Chiberta"
            onChange={(e) => patch({ clubName: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Parcours</label>
          <input
            className="field"
            value={draft.courseName}
            placeholder="Grand parcours"
            onChange={(e) => patch({ courseName: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Nombre de trous</label>
          <SegmentedControl
            value={String(draft.holeCount) as '9' | '18'}
            onChange={(v) => changeHoleCount(Number(v) as HoleCount)}
            options={[
              { value: '9', label: '9 trous' },
              { value: '18', label: '18 trous' },
            ]}
          />
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <span className="label mb-0">Série de départ</span>
          <div className="flex gap-1">
            <button onClick={addTee} className="p-1.5 rounded-lg text-veil/50 hover:bg-veil/10" aria-label="Ajouter une série">
              <PlusIcon className="w-[18px] h-[18px]" />
            </button>
            {draft.tees.length > 1 && (
              <button onClick={removeTee} className="p-1.5 rounded-lg text-danger-ink/70 hover:bg-veil/10" aria-label="Supprimer la série">
                <TrashIcon className="w-[18px] h-[18px]" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
          {draft.tees.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setTeeIndex(i)}
              className={`shrink-0 rounded-xl px-3 py-2 text-sm font-medium border ${
                i === teeIndex
                  ? 'bg-accent border-accent text-white'
                  : 'bg-elevated border-veil/10 text-veil/70'
              }`}
            >
              {t.name || '—'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Nom de la série</label>
            <input className="field" value={tee.name} onChange={(e) => patchTee({ name: e.target.value })} />
          </div>
          <div>
            <label className="label">SSS / rating</label>
            <input
              className="field"
              type="number"
              step="0.1"
              inputMode="decimal"
              placeholder="70.8"
              value={tee.scratchRating ?? ''}
              onChange={(e) =>
                patchTee({ scratchRating: e.target.value === '' ? undefined : Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="label">Slope</label>
            <input
              className="field"
              type="number"
              inputMode="numeric"
              placeholder="128"
              value={tee.slope ?? ''}
              onChange={(e) => patchTee({ slope: e.target.value === '' ? undefined : Number(e.target.value) })}
            />
          </div>
        </div>
        <p className="text-xs text-veil/40">
          Rating et slope servent à calculer le handicap de jeu. Laisse vide pour utiliser
          simplement l'index des joueurs.
        </p>
      </div>

      <HoleGrid holes={tee.holes} onChange={patchHole} />

      <button onClick={exportJson} className="btn-ghost w-full text-sm">
        Exporter en JSON
      </button>
      <button
        onClick={() => {
          if (!confirm(`Supprimer définitivement « ${courseLabel(draft)} » ?`)) return
          deleteCourse(draft.id)
          navigate('/courses')
        }}
        className="btn-danger w-full text-sm"
      >
        Supprimer ce parcours
      </button>
    </Screen>
  )
}

function HoleGrid({
  holes,
  onChange,
}: {
  holes: Hole[]
  onChange: (index: number, changes: Partial<Hole>) => void
}) {
  const halves = useMemo(
    () =>
      holes.length > 9
        ? [
            { label: 'Aller', from: 0, to: 9 },
            { label: 'Retour', from: 9, to: holes.length },
          ]
        : [{ label: 'Trous', from: 0, to: holes.length }],
    [holes.length],
  )

  return (
    <div className="card space-y-4">
      <div className="flex items-baseline justify-between">
        <span className="label mb-0">Carte de score</span>
        <span className="text-sm text-veil/50">par {totalPar(holes)}</span>
      </div>

      {halves.map((half) => (
        <div key={half.label}>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-xs font-medium text-accent-ink">{half.label}</span>
            <span className="text-xs text-veil/40">
              par {totalPar(holes.slice(half.from, half.to))}
            </span>
          </div>
          <div className="grid grid-cols-[1.6rem_1fr_1fr_1.3fr] gap-x-2 gap-y-1 items-center">
            <div className="text-[10px] uppercase text-veil/40">Tr.</div>
            <div className="text-[10px] uppercase text-veil/40">Par</div>
            <div className="text-[10px] uppercase text-veil/40">SI</div>
            <div className="text-[10px] uppercase text-veil/40">Mètres</div>
            {holes.slice(half.from, half.to).map((hole, offset) => {
              const index = half.from + offset
              return (
                <HoleRow
                  key={hole.number}
                  hole={hole}
                  onChange={(changes) => onChange(index, changes)}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function HoleRow({ hole, onChange }: { hole: Hole; onChange: (changes: Partial<Hole>) => void }) {
  return (
    <>
      <div className="text-sm text-veil/50 tabular-nums">{hole.number}</div>
      <select
        className="field px-2 py-1.5 text-sm appearance-none"
        value={hole.par}
        onChange={(e) => onChange({ par: Number(e.target.value) })}
      >
        {[3, 4, 5, 6].map((par) => (
          <option key={par} value={par}>
            {par}
          </option>
        ))}
      </select>
      <input
        className="field px-2 py-1.5 text-sm text-center tabular-nums"
        type="number"
        inputMode="numeric"
        min={1}
        max={18}
        value={hole.si}
        onChange={(e) => onChange({ si: Number(e.target.value) })}
      />
      <input
        className="field px-2 py-1.5 text-sm text-center tabular-nums"
        type="number"
        inputMode="numeric"
        placeholder="—"
        value={hole.meters ?? ''}
        onChange={(e) => onChange({ meters: e.target.value === '' ? undefined : Number(e.target.value) })}
      />
    </>
  )
}
