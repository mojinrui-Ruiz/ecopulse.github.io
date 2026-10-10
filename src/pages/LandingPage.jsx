import { useApp } from '../AppContext'
import { EMISSION_FACTORS } from '../carbonEngine'

export default function LandingPage() {
  const { setPage, sessionCarbon, sessionBreakdown } = useApp()
  const f = EMISSION_FACTORS['edinburgh']
  const score = +sessionCarbon.toFixed(2)
  const scoreColor = score < 10 ? 'var(--green)' : score < 25 ? 'var(--amber)' : 'var(--red)'
  const label = score < 10 ? 'Low Impact' : score < 25 ? 'Moderate Impact' : 'High Impact'

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '32px 36px',
      display: 'flex',
      flexDirection: 'column',
      gap: 28,
    }}>
      {/* Hero */}
      <div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '2px',
          color: 'var(--text3)',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}>
          EcoPulse · {f.city}, {f.country}
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 38,
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: '-1px',
          marginBottom: 12,
        }}>
          Your household<br />
          <span style={{ color: scoreColor }}>{label.toLowerCase()}</span><br />
          carbon footprint
        </h1>
        <p style={{ color: 'var(--text2)', maxWidth: 480, lineHeight: 1.7, fontSize: 14 }}>
          EcoPulse translates your daily behaviours into real CO₂e data,
          using DEFRA 2023 emission factors and an emotionally-driven interface
          designed to build understanding, trust, and lasting engagement.
        </p>
      </div>

      {/* Score + breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div style={{
          background: 'var(--surface)',
          border: `0.5px solid var(--border2)`,
          borderRadius: 14,
          padding: '20px 22px',
          gridColumn: '1',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Session Carbon</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
            {score.toFixed(1)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>kg CO₂e</div>
          <div style={{ marginTop: 14, height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, score/40*100)}%`, background: scoreColor, borderRadius: 2, transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'var(--text3)' }}>
            <span>0</span><span>daily avg 5</span><span>40</span>
          </div>
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '0.5px solid var(--border2)',
          borderRadius: 14,
          padding: '20px 22px',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14 }}>Breakdown</div>
          {Object.entries(sessionBreakdown).map(([key, val]) => {
            const colors = { energy: 'var(--blue)', transport: 'var(--amber)', flights: 'var(--red)', food: 'var(--green)', shopping: '#c084fc', waste: 'var(--text3)' }
            const labels = { energy: 'Energy', transport: 'Transport', flights: 'Flights', food: 'Food', shopping: 'Shopping', waste: 'Waste' }
            const pct = score > 0 ? Math.min(100, val / score * 100) : 0
            return (
              <div key={key} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text2)' }}>{labels[key]}</span>
                  <span style={{ color: colors[key], fontFamily: 'var(--font-mono)', fontSize: 10 }}>{val.toFixed(1)} kg</span>
                </div>
                <div style={{ height: 3, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: colors[key], borderRadius: 2, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            )
          })}
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '0.5px solid var(--border2)',
          borderRadius: 14,
          padding: '20px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px' }}>This equals...</div>
          {[
            { icon: '💡', val: `${Math.round(score*10)} hrs`,                    desc: 'of a 100W bulb' },
            { icon: '🌳', val: `${(score/21*7).toFixed(1)} days`,               desc: 'of tree absorption' },
            { icon: '📱', val: `${Math.round(score/0.00886).toLocaleString()}×`, desc: 'phone charges' },
            { icon: '✈️', val: `${(score/725*100).toFixed(1)}%`,                desc: 'of LHR → PEK flight' },
            { icon: '🥩', val: `${(score/12.0).toFixed(1)}×`,                   desc: '200g beef portions (Poore 2018)' },
          ].map(eq => (
            <div key={eq.icon} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16, width: 24 }}>{eq.icon}</span>
              <div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>{eq.val}</span>
                <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>{eq.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA cards — updated: removed inputs and compare, added results and game */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        {[
          {
            icon: '🗺️', page: 'map',
            title: 'Explore City Map',
            desc: 'Navigate Edinburgh landmarks and see the carbon cost of everyday student decisions.',
            color: 'var(--edinburgh)',
          },
          {
            icon: '📊', page: 'results',
            title: 'Carbon Score',
            desc: 'See your weekly total broken down by category and compared to UK averages.',
            color: 'var(--green)',
          },
          {
            icon: '🎮', page: 'game',
            title: 'Survival Game',
            desc: 'Can you keep your carbon low, energy high, and budget intact across 8 turns?',
            color: 'var(--amber)',
          },
        ].map(card => (
          <button
            key={card.page}
            onClick={() => setPage(card.page)}
            style={{
              background: 'var(--surface)',
              border: '0.5px solid var(--border)',
              borderRadius: 12,
              padding: '18px 20px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s',
              color: 'var(--text)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.borderColor = 'var(--border2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            <div style={{ fontSize: 20, color: card.color, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{card.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>{card.desc}</div>
          </button>
        ))}
      </div>

      {/* Research context */}
      <div style={{
        background: 'var(--surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
      }}>
        <div style={{ fontSize: 20 }}>⊛</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Research-through-Design Prototype · University of Edinburgh</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>
            EcoPulse explores how emotionally-driven metaphors and transparent calculation logic
            affect comprehension, trust, and engagement in eco-feedback systems.
            Designed for Chinese international students at the University of Edinburgh.
            Emission factors: DEFRA 2023 · Food data: Poore & Nemecek (2018) Science · Aligned with SDG 12 & 13
          </div>
        </div>
      </div>
    </div>
  )
}
