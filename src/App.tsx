import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useStore } from './store/useStore'
import { applyTheme, watchSystemTheme } from './theme'
import Home from './screens/Home'
import Courses from './screens/Courses'
import CourseEditor from './screens/CourseEditor'
import CourseImport from './screens/CourseImport'
import Players from './screens/Players'
import NewRound from './screens/NewRound'
import Scoring from './screens/Scoring'
import Scorecard from './screens/Scorecard'
import Results from './screens/Results'
import History from './screens/History'
import Settings from './screens/Settings'

export default function App() {
  const theme = useStore((s) => s.theme)
  const brandStyle = useStore((s) => s.brandStyle)

  useEffect(() => {
    applyTheme(theme, brandStyle)
    // En mode « Système », suivre les bascules jour/nuit du téléphone.
    if (theme !== 'system') return
    return watchSystemTheme(() => applyTheme('system', brandStyle))
  }, [theme, brandStyle])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/courses" element={<Courses />} />
      <Route path="/courses/import" element={<CourseImport />} />
      <Route path="/courses/:id" element={<CourseEditor />} />
      <Route path="/players" element={<Players />} />
      <Route path="/new" element={<NewRound />} />
      <Route path="/round/:id" element={<Scoring />} />
      <Route path="/round/:id/card" element={<Scorecard />} />
      <Route path="/round/:id/results" element={<Results />} />
      <Route path="/history" element={<History />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
