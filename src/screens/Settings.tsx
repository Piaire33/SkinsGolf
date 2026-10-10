import { Screen, SegmentedControl } from '@/components/ui'
import { useStore } from '@/store/useStore'
import {
  STYLE_HINTS,
  STYLE_LABELS,
  THEME_LABELS,
  resolveTheme,
  systemTheme,
  type BrandStyle,
  type ThemeChoice,
} from '@/theme'

export default function Settings() {
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  const brandStyle = useStore((s) => s.brandStyle)
  const setBrandStyle = useStore((s) => s.setBrandStyle)
  const courses = useStore((s) => s.courses)
  const rounds = useStore((s) => s.rounds)
  const players = useStore((s) => s.players)

  function exportAll() {
    const blob = new Blob([JSON.stringify({ courses, players, rounds }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `skinsgolf-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Screen title="Réglages" back="/">
      <section className="card space-y-3">
        <span className="label mb-0">Style</span>
        <SegmentedControl
          value={brandStyle}
          onChange={(value) => setBrandStyle(value as BrandStyle)}
          options={(Object.keys(STYLE_LABELS) as BrandStyle[]).map((style) => ({
            value: style,
            label: STYLE_LABELS[style],
            hint: STYLE_HINTS[style],
          }))}
        />
        <p className="text-xs text-veil/45">
          Deux identités inspirées des circuits professionnels : couleurs, bandeau et boutons.
        </p>

        <span className="label mb-0 pt-2">Mode</span>
        <SegmentedControl
          value={theme}
          onChange={(value) => setTheme(value as ThemeChoice)}
          options={(Object.keys(THEME_LABELS) as ThemeChoice[]).map((choice) => ({
            value: choice,
            label: THEME_LABELS[choice],
            hint: choice === 'system' ? THEME_LABELS[systemTheme()].toLowerCase() : undefined,
          }))}
        />
        <p className="text-xs text-veil/45">
          {theme === 'system'
            ? `Suit le réglage du téléphone, actuellement en ${THEME_LABELS[systemTheme()].toLowerCase()}.`
            : resolveTheme(theme) === 'dark'
              ? 'Le thème sombre économise la batterie sur écran OLED.'
              : 'Le thème clair reste lisible en plein soleil sur le parcours.'}
        </p>
      </section>

      <section className="card space-y-2">
        <span className="label mb-0">Import de parcours</span>
        <p className="text-sm text-veil/60">
          Les cartes de score sont importées depuis OpenStreetMap, sans compte ni clé. Les
          données sont contributives : vérifie toujours les pars et les stroke index avant de
          jouer de l'argent dessus.
        </p>
        <p className="text-xs text-veil/40">
          Données cartographiques ©{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            les contributeurs OpenStreetMap
          </a>
          , sous licence ODbL. Une fois un parcours importé, l'app n'a plus besoin de réseau.
        </p>
      </section>

      <section className="card space-y-3">
        <span className="label mb-0">Données</span>
        <div className="text-sm text-veil/60 tabular-nums">
          {courses.length} parcours · {players.length} joueurs · {rounds.length} parties
        </div>
        <button onClick={exportAll} className="btn-ghost w-full text-sm">
          Exporter une sauvegarde JSON
        </button>
        <p className="text-xs text-veil/40">
          Tout est stocké dans ce navigateur. Vider les données du site effacerait les parties :
          exporte une sauvegarde de temps en temps.
        </p>
      </section>

      <section className="card space-y-2">
        <span className="label mb-0">Installer sur l'écran d'accueil</span>
        <p className="text-sm text-veil/60">
          Dans Chrome Android : menu ⋮ puis « Ajouter à l'écran d'accueil ». L'app s'ouvre alors
          en plein écran et fonctionne sans réseau, y compris en mode avion sur le parcours.
        </p>
      </section>
    </Screen>
  )
}
