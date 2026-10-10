import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Screen, SegmentedControl, Toggle, euro } from '@/components/ui'
import { CoinIcon, PlusIcon } from '@/components/icons'
import { useStore } from '@/store/useStore'
import { courseLabel, defaultValueByPar, distinctPars, uid, validateCourse } from '@/domain/course'
import { playingHandicap, totalPar } from '@/domain/handicap'
import { FORMAT_LABELS, type Format, type Participant, type SkinsTieRule } from '@/domain/types'

const MAX_PLAYERS = 4
const TEAMS = ['A', 'B'] as const

export default function NewRound() {
  const navigate = useNavigate()
  const courses = useStore((s) => s.courses)
  const players = useStore((s) => s.players)
  const upsertPlayer = useStore((s) => s.upsertPlayer)
  const createRound = useStore((s) => s.createRound)

  const [courseId, setCourseId] = useState(courses[0]?.id ?? '')
  const [teeId, setTeeId] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [teamOf, setTeamOf] = useState<Record<string, 'A' | 'B'>>({})
  const [format, setFormat] = useState<Format>('stableford')
  const [net, setNet] = useState(true)
  const [allowance, setAllowance] = useState(1)

  const [skinsOn, setSkinsOn] = useState(true)
  const [skinsNet, setSkinsNet] = useState(false)
  const [tieRule, setTieRule] = useState<SkinsTieRule>('carryOver')
  const [stakes, setStakes] = useState<Record<number, number>>({})

  const [quickName, setQuickName] = useState('')

  const course = courses.find((c) => c.id === courseId)
  const tee = course?.tees.find((t) => t.id === teeId) ?? course?.tees[0]
  const holes = tee?.holes ?? []
  const pars = useMemo(() => distinctPars(holes), [holes])

  // Série de départ et mises par défaut suivent le parcours sélectionné.
  useEffect(() => {
    if (course && !course.tees.some((t) => t.id === teeId)) setTeeId(course.tees[0]?.id ?? '')
  }, [course, teeId])

  useEffect(() => {
    if (holes.length === 0) return
    setStakes((current) => {
      const defaults = defaultValueByPar(holes)
      // On garde les montants déjà saisis pour les pars encore présents.
      const next: Record<number, number> = {}
      for (const par of Object.keys(defaults).map(Number)) {
        next[par] = current[par] ?? defaults[par]
      }
      return next
    })
  }, [holes])

  // Le skins se joue en duel : avec deux joueurs, le perdant d'un trou paie le
  // gagnant sans ambiguïté sur qui doit quoi. Au-delà, l'option est désactivée.
  const skinsAvailable = selected.length === 2
  const skinsActive = skinsOn && skinsAvailable

  const needsTeams = format === 'scramble' || (format === 'matchplay' && selected.length > 2)
  const courseErrors = course ? validateCourse(course) : ['Aucun parcours disponible.']

  const problems: string[] = []
  if (!course) problems.push('Choisis un parcours.')
  else if (courseErrors.length > 0) problems.push(`Carte de score incomplète : ${courseErrors[0]}`)
  if (selected.length === 0) problems.push('Sélectionne au moins un joueur.')
  if (format === 'matchplay') {
    const sides = needsTeams ? new Set(selected.map((id) => teamOf[id] ?? 'A')).size : selected.length
    if (sides !== 2) problems.push('Le match play se joue entre exactement deux camps.')
  }
  if (needsTeams) {
    const empty = TEAMS.filter((t) => !selected.some((id) => (teamOf[id] ?? 'A') === t))
    if (empty.length > 0) problems.push(`L'équipe ${empty.join(' et ')} est vide.`)
  }
  if (skinsActive && pars.every((par) => !stakes[par])) {
    problems.push("Renseigne la valeur d'au moins un trou pour le skins game.")
  }

  function togglePlayer(id: string) {
    setSelected((list) => {
      if (list.includes(id)) return list.filter((x) => x !== id)
      if (list.length >= MAX_PLAYERS) return list
      return [...list, id]
    })
  }

  function quickAdd() {
    const trimmed = quickName.trim()
    if (!trimmed) return
    const player = { id: uid(), name: trimmed, index: 0 }
    upsertPlayer(player)
    setQuickName('')
    if (selected.length < MAX_PLAYERS) setSelected((list) => [...list, player.id])
  }

  function start() {
    if (!course || !tee || problems.length > 0) return
    const participants: Participant[] = selected.map((playerId) => ({
      playerId,
      ...(needsTeams ? { teamId: teamOf[playerId] ?? 'A' } : {}),
    }))
    const round = createRound({
      course,
      teeId: tee.id,
      format,
      net,
      hcpAllowance: allowance,
      participants,
      skins: { enabled: skinsActive, net: skinsNet, valueByPar: stakes, tieRule },
    })
    navigate(`/round/${round.id}`, { replace: true })
  }

  return (
    <Screen
      title="Nouvelle partie"
      back="/"
      footer={
        <div className="space-y-2">
          {problems.length > 0 && <p className="text-xs text-warn-ink">• {problems[0]}</p>}
          <button onClick={start} disabled={problems.length > 0} className="btn-primary w-full py-4">
            Démarrer la partie
          </button>
        </div>
      }
    >
      {/* ---------- Parcours ---------- */}
      <section className="card space-y-3">
        <span className="label mb-0">Parcours</span>
        {courses.length === 0 ? (
          <Link to="/courses" className="btn-ghost w-full text-sm">
            Aucun parcours — en créer un
          </Link>
        ) : (
          <select className="field" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {courseLabel(c)} ({c.holeCount} trous)
              </option>
            ))}
          </select>
        )}

        {course && course.tees.length > 0 && (
          <div>
            <span className="label">Série de départ</span>
            <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
              {course.tees.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTeeId(t.id)}
                  className={`shrink-0 rounded-xl px-3 py-2 text-sm font-medium border ${
                    t.id === (tee?.id ?? '')
                      ? 'bg-accent border-accent text-white'
                      : 'bg-elevated border-veil/10 text-veil/70'
                  }`}
                >
                  {t.name}
                  <span className="block text-[11px] opacity-60">par {totalPar(t.holes)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ---------- Joueurs ---------- */}
      <section className="card space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="label mb-0">Joueurs</span>
          <span className="text-xs text-veil/40">{selected.length}/{MAX_PLAYERS}</span>
        </div>

        <div className="space-y-2">
          {players.map((player) => {
            const isSelected = selected.includes(player.id)
            const ph =
              tee && course ? playingHandicap(player.index, tee, course.holeCount, allowance) : 0
            return (
              <div key={player.id} className="flex items-center gap-2">
                <button
                  onClick={() => togglePlayer(player.id)}
                  className={`flex-1 flex items-center justify-between rounded-xl px-3 py-2.5 border text-left ${
                    isSelected
                      ? 'bg-accent-soft border-accent'
                      : 'bg-elevated border-veil/10'
                  }`}
                >
                  <span className="font-medium truncate">{player.name}</span>
                  <span className="text-xs text-veil/50 shrink-0 ml-2 tabular-nums">
                    index {player.index} · jeu {ph}
                  </span>
                </button>
                {needsTeams && isSelected && (
                  <div className="flex shrink-0 rounded-xl overflow-hidden border border-veil/10">
                    {TEAMS.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTeamOf((m) => ({ ...m, [player.id]: t }))}
                        className={`w-9 py-2.5 text-sm font-semibold ${
                          (teamOf[player.id] ?? 'A') === t
                            ? 'bg-accent text-white'
                            : 'bg-elevated text-veil/50'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            quickAdd()
          }}
        >
          <input
            className="field flex-1"
            placeholder="Ajouter un joueur…"
            value={quickName}
            onChange={(e) => setQuickName(e.target.value)}
          />
          <button type="submit" disabled={!quickName.trim()} className="btn-ghost px-3">
            <PlusIcon />
          </button>
        </form>
        <p className="text-xs text-veil/40">
          Index à 0 par défaut — ajuste-le dans <Link to="/players" className="underline">Joueurs</Link>.
        </p>
      </section>

      {/* ---------- Formule ---------- */}
      <section className="card space-y-3">
        <span className="label mb-0">Formule de jeu</span>
        <SegmentedControl
          value={format}
          onChange={setFormat}
          columns={2}
          options={(Object.keys(FORMAT_LABELS) as Format[]).map((f) => ({
            value: f,
            label: FORMAT_LABELS[f],
          }))}
        />
        <Toggle
          checked={net}
          onChange={setNet}
          label={net ? 'Net (avec handicap)' : 'Brut'}
          hint={
            net
              ? 'Les coups rendus sont répartis selon le stroke index des trous.'
              : 'Score réel, sans coups rendus.'
          }
        />
        {net && (
          <div>
            <span className="label">Handicap appliqué</span>
            <SegmentedControl
              value={String(allowance)}
              onChange={(v) => setAllowance(Number(v))}
              options={[
                { value: '1', label: '100 %' },
                { value: '0.95', label: '95 %' },
                { value: '0.85', label: '85 %' },
                { value: '0.75', label: '75 %' },
              ]}
            />
          </div>
        )}
      </section>

      {/* ---------- Skins ---------- */}
      <section className="card space-y-3">
        <Toggle
          checked={skinsActive}
          onChange={setSkinsOn}
          disabled={!skinsAvailable}
          label="Skins game"
          hint={
            skinsAvailable
              ? 'Un duel entre les deux joueurs, en parallèle de la formule principale.'
              : 'Le skins se joue à deux : sélectionne exactement 2 joueurs.'
          }
        />

        {skinsActive && (
          <div className="space-y-3 pt-1 border-t border-veil/5">
            <Toggle
              checked={skinsNet}
              onChange={setSkinsNet}
              label={skinsNet ? 'Skins en net' : 'Skins en brut'}
              hint={
                skinsNet
                  ? 'Les coups rendus comptent aussi pour gagner le trou.'
                  : 'Celui qui joue le meilleur score réel gagne le trou.'
              }
            />

            <div>
              <span className="label">Valeur du trou, selon son par</span>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${pars.length || 1}, minmax(0,1fr))` }}>
                {pars.map((par) => (
                  <div key={par}>
                    <div className="text-xs text-veil/50 mb-1 text-center">Par {par}</div>
                    <div className="relative">
                      <input
                        className="field text-center tabular-nums pr-7"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.5"
                        value={stakes[par] ?? ''}
                        onChange={(e) =>
                          setStakes((s) => ({ ...s, [par]: Number(e.target.value) || 0 }))
                        }
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-veil/40 text-sm">
                        €
                      </span>
                    </div>
                    <div className="text-[11px] text-accent-ink mt-1 text-center tabular-nums">
                      {holes.filter((h) => h.par === par).length} trou
                      {holes.filter((h) => h.par === par).length > 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-veil/40 mt-2 flex items-start gap-1.5">
                <CoinIcon className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Le vainqueur d'un trou touche sa valeur de son adversaire. Le solde se
                  règle à la fin de la partie. Total des {holes.length} trous :{' '}
                  <strong className="text-accent-ink">
                    {euro(holes.reduce((sum, h) => sum + (stakes[h.par] ?? 0), 0))}
                  </strong>
                  .
                </span>
              </p>
            </div>

            <div>
              <span className="label">En cas d'égalité sur un trou</span>
              <SegmentedControl
                value={tieRule}
                onChange={setTieRule}
                columns={3}
                options={[
                  { value: 'carryOver', label: 'Report', hint: 'cumulé' },
                  { value: 'split', label: 'Partage', hint: 'ex-aequo' },
                  { value: 'void', label: 'Annulé', hint: 'rien ne bouge' },
                ]}
              />
            </div>
          </div>
        )}
      </section>
    </Screen>
  )
}
