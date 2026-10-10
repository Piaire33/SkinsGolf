import { useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState, Screen } from '@/components/ui'
import { PlusIcon, SearchIcon } from '@/components/icons'
import { useStore } from '@/store/useStore'
import { blankCourse, courseLabel, uid, validateCourse } from '@/domain/course'
import { totalPar } from '@/domain/handicap'
import type { Course } from '@/domain/types'

export default function Courses() {
  const navigate = useNavigate()
  const courses = useStore((s) => s.courses)
  const upsertCourse = useStore((s) => s.upsertCourse)
  const fileInput = useRef<HTMLInputElement>(null)

  function createCourse() {
    const course = blankCourse(18)
    upsertCourse(course)
    navigate(`/courses/${course.id}`)
  }

  async function importFile(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as Course | Course[]
      const list = Array.isArray(parsed) ? parsed : [parsed]
      let imported = 0
      for (const raw of list) {
        const course: Course = { ...raw, id: uid(), source: 'import' }
        const errors = validateCourse(course)
        if (errors.length > 0) {
          alert(`« ${course.clubName || 'parcours'} » n'a pas pu être importé :\n${errors.join('\n')}`)
          continue
        }
        upsertCourse(course)
        imported++
      }
      if (imported > 0) alert(`${imported} parcours importé${imported > 1 ? 's' : ''}.`)
    } catch {
      alert("Fichier illisible : il doit contenir un parcours exporté depuis l'app, au format JSON.")
    }
  }

  return (
    <Screen
      title="Parcours"
      subtitle={`${courses.length} enregistré${courses.length > 1 ? 's' : ''}`}
      back="/"
    >
      <div className="grid grid-cols-2 gap-2">
        <button onClick={createCourse} className="btn-primary">
          <PlusIcon /> Nouveau
        </button>
        <Link to="/courses/import" className="btn-ghost">
          <SearchIcon /> Chercher en ligne
        </Link>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          title="Aucun parcours"
          hint="Crée une carte de score à la main, ou cherche ton club en ligne."
        />
      ) : (
        <div className="space-y-2.5">
          {courses.map((course) => (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="card block hover:border-accent transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{courseLabel(course)}</div>
                  <div className="text-sm text-veil/50">
                    {course.holeCount} trous · par {totalPar(course.tees[0]?.holes ?? [])} ·{' '}
                    {course.tees.map((t) => t.name).join(', ')}
                  </div>
                </div>
                {course.source === 'sample' && (
                  <span className="shrink-0 text-[10px] uppercase tracking-wide bg-veil/10 rounded px-1.5 py-0.5 text-veil/50">
                    exemple
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="pt-2">
        <button onClick={() => fileInput.current?.click()} className="btn-ghost w-full text-sm">
          Importer un fichier JSON
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void importFile(file)
            e.target.value = ''
          }}
        />
      </div>
    </Screen>
  )
}
