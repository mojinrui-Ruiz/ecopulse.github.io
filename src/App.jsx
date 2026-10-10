import { useApp } from './AppContext'
import Sidebar from './components/Sidebar'
import LandingPage from './pages/LandingPage'
import MapPage from './pages/MapPage'
import GamePage from './pages/GamePage'
import { ResultsPage, TimelinePage, TransparencyPage } from './pages/OtherPages'

export default function App() {
  const { page } = useApp()

  const pages = {
    landing:      <LandingPage />,
    map:          <MapPage />,
    results:      <ResultsPage />,
    timeline:     <TimelinePage />,
    transparency: <TransparencyPage />,
    game:         <GamePage />,
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        {pages[page] || <LandingPage />}
      </main>
    </div>
  )
}
