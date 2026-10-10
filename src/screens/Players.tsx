import { useState } from 'react'
import { EmptyState, Screen } from '@/components/ui'
import { PlusIcon, TrashIcon } from '@/components/icons'
import { useStore } from '@/store/useStore'
import { uid } from '@/domain/course'
import { formatHcp } from '@/domain/strokeplay'

export default function Players() {
  const players = useStore((s) => s.players)
  const upsertPlayer = useStore((s) => s.upsertPlayer)
  const deletePlayer = useStore((s) => s.deletePlayer)

  const [name, setName] = useState('')
  const [index, setIndex] = useState('')

  function add() {
    const trimmed = name.trim()
    if (!trimmed) return
    upsertPlayer({ id: uid(), name: trimmed, index: Number(index.replace(',', '.')) || 0 })
    setName('')
    setIndex('')
  }

  return (
    <Screen title="Joueurs" subtitle="Carnet réutilisé à chaque partie" back="/">
      <form
        className="card space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <div className="grid grid-cols-[1fr_5.5rem] gap-2">
          <div>
            <label className="label">Nom</label>
            <input
              className="field"
              value={name}
              placeholder="Pierre"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Index</label>
            <input
              className="field text-center tabular-nums"
              type="text"
              inputMode="decimal"
              placeholder="18,4"
              value={index}
              onChange={(e) => setIndex(e.target.value)}
            />
          </div>
        </div>
        <button type="submit" disabled={!name.trim()} className="btn-primary w-full">
          <PlusIcon /> Ajouter au carnet
        </button>
      </form>

      {players.length === 0 ? (
        <EmptyState
          title="Carnet vide"
          hint="Ajoute les joueurs avec qui tu joues régulièrement : tu n'auras plus qu'à les cocher au départ."
        />
      ) : (
        <div className="space-y-2">
          {players.map((player) => (
            <div key={player.id} className="card flex items-center gap-3 py-3">
              <input
                className="field flex-1 py-2"
                value={player.name}
                onChange={(e) => upsertPlayer({ ...player, name: e.target.value })}
              />
              <input
                className="field w-20 py-2 text-center tabular-nums"
                type="text"
                inputMode="decimal"
                value={player.index}
                onChange={(e) =>
                  upsertPlayer({ ...player, index: Number(e.target.value.replace(',', '.')) || 0 })
                }
              />
              <button
                onClick={() => {
                  if (confirm(`Retirer ${player.name} du carnet ?`)) deletePlayer(player.id)
                }}
                className="p-2 rounded-lg text-danger-ink/70 hover:bg-veil/10"
                aria-label={`Supprimer ${player.name}`}
              >
                <TrashIcon className="w-[18px] h-[18px]" />
              </button>
            </div>
          ))}
          <p className="text-xs text-veil/40 px-1">
            L'index peut être négatif pour un joueur « plus » (saisis -1 pour un index +1).
            Exemple d'affichage : {formatHcp(-1)}.
          </p>
        </div>
      )}
    </Screen>
  )
}
