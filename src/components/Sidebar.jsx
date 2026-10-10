import { useApp } from '../AppContext'

export default function Sidebar() {
  const { page, setPage } = useApp()

  const navItems = [
    { id: 'landing',      icon: '🌍', label: 'Overview' },
    { id: 'map',          icon: '🗺️', label: 'City Map' },
    { id: 'results',      icon: '📊', label: 'Carbon Score' },
    { id: 'timeline',     icon: '⏱️', label: 'Future View' },
    { id: 'transparency', icon: '🔍', label: 'Data Sources' },
    { id: 'game',         icon: '🎮', label: 'Survival Game', badge: 'NEW' },
  ]

  return (
    <nav style={{
      width: 180,
      background: '#070b12',
      borderRight: '0.5px solid rgba(255,255,255,0.07)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 0',
      flexShrink: 0,
    }}>
      <div style={{ padding: '0 16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#3ddc84', letterSpacing: '-0.3px' }}>EcoPulse</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>🏴󠁧󠁢󠁳󠁣󠁴󠁿 Edinburgh</div>
      </div>

      <div style={{ flex: 1, padding: '8px 0' }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setPage(item.id)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 16px',
            background: page === item.id ? 'rgba(255,255,255,0.07)' : 'none',
            border: 'none', cursor: 'pointer',
            color: page === item.id ? 'white' : 'rgba(255,255,255,0.5)',
            fontFamily: 'inherit', fontSize: 13,
            fontWeight: page === item.id ? 600 : 400,
            borderLeft: `2px solid ${page === item.id ? '#3ddc84' : 'transparent'}`,
            transition: 'all .15s', textAlign: 'left',
          }}>
            <span style={{ fontSize: 14 }}>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge && (
              <span style={{
                fontSize: 8, background: '#3ddc84', color: '#070b12',
                padding: '2px 5px', borderRadius: 4, fontWeight: 800,
              }}>{item.badge}</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 16px', borderTop: '0.5px solid rgba(255,255,255,0.07)', fontSize: 9, color: 'rgba(255,255,255,0.2)', lineHeight: 1.5 }}>
        DEFRA 2023<br/>Poore & Nemecek 2018
      </div>
    </nav>
  )
}
