import { useState } from 'react'
import { useApp } from '../AppContext'
import { EQUIVALENCIES } from '../carbonEngine'

export function ResultsPage() {
  const { sessionCarbon, sessionBreakdown, resetSession } = useApp()
  const total = +sessionCarbon.toFixed(2)
  const breakdown = sessionBreakdown
  const eq = EQUIVALENCIES(total)
  const scoreColor = total < 10 ? 'var(--green)' : total < 25 ? 'var(--amber)' : 'var(--red)'
  const rating = total === 0 ? 'No activity yet' : total < 10 ? 'Excellent' : total < 20 ? 'Good' : total < 30 ? 'Average' : total < 40 ? 'High' : 'Very High'

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, alignItems: 'center' }}>
        <div style={{ background: 'var(--surface)', border: `1px solid ${scoreColor}33`, borderRadius: 16, padding: '24px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Session Carbon</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{total.toFixed(1)}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>{total === 0 ? 'Explore the City Map to start' : 'kg CO₂e from City Map'}</div>
          <div style={{ marginTop: 12, background: 'var(--surface2)', borderRadius: 20, padding: '4px 14px', fontSize: 11, color: scoreColor, display: 'inline-block' }}>{rating}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Object.entries(breakdown).map(([key, val]) => {
            const colors = { energy: 'var(--blue)', transport: 'var(--amber)', flights: 'var(--red)', food: 'var(--green)', shopping: '#c084fc', waste: 'var(--text3)' }
            const labels = { energy: '⚡ Energy', transport: '🚗 Transport', flights: '✈️ Flights', food: '🥗 Food', shopping: '🛍 Shopping', waste: '♻️ Waste' }
            const pct = total > 0 ? Math.min(100, val / total * 100) : 0
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 90, fontSize: 12, color: 'var(--text2)' }}>{labels[key]}</div>
                <div style={{ flex: 1, height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: colors[key], borderRadius: 3, transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ width: 80, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: colors[key] }}>{val.toFixed(1)} kg</div>
                <div style={{ width: 36, textAlign: 'right', fontSize: 10, color: 'var(--text3)' }}>{pct.toFixed(0)}%</div>
              </div>
            )
          })}
          <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
            <span style={{ color: 'var(--text2)' }}>Total (this session)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: scoreColor }}>{total.toFixed(2)} kg CO₂e</span>
              <button onClick={resetSession} style={{ fontSize: 10, color: 'var(--text3)', background: 'var(--surface2)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>Reset</button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14 }}>This week equals...</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { icon: '💡', val: `${eq.bulbHours.toLocaleString()} hrs`, desc: 'of a 100W bulb burning' },
            { icon: '🌳', val: `${eq.treeDays} days`, desc: 'of tree absorption' },
            { icon: '📱', val: `${eq.phonesCharged.toLocaleString()}×`, desc: 'smartphone charges' },
            { icon: '✈️', val: `${eq.flightPct}%`, desc: 'of LHR → PEK flight' },
            { icon: '🥩', val: `${eq.steakEquiv}×`, desc: '200g beef portions' },
            { icon: '🚗', val: `${eq.kmByEV.toLocaleString()} km`, desc: 'by electric car' },
          ].map(e => (
            <div key={e.icon} style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{e.icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>{e.val}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, lineHeight: 1.4 }}>{e.desc}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

export function TimelinePage() {
  const { sessionCarbon } = useApp()
  const [year, setYear] = useState(2026)
  const [targetReduction, setTargetReduction] = useState(20)

  // Extrapolate: session carbon to daily estimate (assume ~4 decisions per session)
  const dailyEstimate = sessionCarbon > 0 ? sessionCarbon : 5
  const weeklyEstimate = dailyEstimate * 7
  const yearsAhead = year - 2026
  const weeksAhead = yearsAhead * 52 + 52
  const cumulative = weeklyEstimate * weeksAhead
  const withTarget = weeklyEstimate * (1 - targetReduction / 100) * weeksAhead
  const saving = cumulative - withTarget

  const landscapeColor = dailyEstimate < 3 ? 'rgba(30,180,80,0.3)' : dailyEstimate < 8 ? 'rgba(180,140,30,0.2)' : 'rgba(180,60,30,0.3)'

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Future projection</h2>
        <p style={{ color: 'var(--text3)', fontSize: 13, lineHeight: 1.7 }}>If current behaviour continues, what will the cumulative impact be?</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Projection year</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <input type="range" min={2026} max={2040} value={year} step={1}
              onChange={e => setYear(parseInt(e.target.value))}
              className="ep-slider"
              style={{ flex: 1, height: 4, WebkitAppearance: 'none', background: `linear-gradient(to right, var(--amber) ${(year-2026)/14*100}%, var(--surface2) ${(year-2026)/14*100}%)`, borderRadius: 2, outline: 'none', cursor: 'pointer' }}
            />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--amber)', minWidth: 60 }}>{year}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{yearsAhead + 1} year{yearsAhead !== 0 ? 's' : ''} · {weeksAhead} weeks</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Reduction target</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <input type="range" min={0} max={80} value={targetReduction} step={5}
              onChange={e => setTargetReduction(parseInt(e.target.value))}
              className="ep-slider"
              style={{ flex: 1, height: 4, WebkitAppearance: 'none', background: `linear-gradient(to right, var(--green) ${targetReduction/80*100}%, var(--surface2) ${targetReduction/80*100}%)`, borderRadius: 2, outline: 'none', cursor: 'pointer' }}
            />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--green)', minWidth: 60 }}>{targetReduction}%</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>Target: {(weeklyEstimate * (1 - targetReduction / 100)).toFixed(1)} kg/week</div>
        </div>
      </div>

      <style>{`.ep-slider::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#fff;cursor:pointer;border:2px solid var(--bg)}`}</style>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {[
          { label: 'Without change', val: `${(cumulative/1000).toFixed(2)} t`, sub: 'CO₂e total', color: weeklyEstimate < 35 ? 'var(--amber)' : 'var(--red)' },
          { label: `With ${targetReduction}% reduction`, val: `${(withTarget/1000).toFixed(2)} t`, sub: 'CO₂e total', color: 'var(--green)' },
          { label: 'Saving', val: `${(saving/1000).toFixed(2)} t`, sub: `over ${yearsAhead + 1} year${yearsAhead !== 0 ? 's' : ''}`, color: 'var(--green)' },
        ].map(card => (
          <div key={card.label} style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: card.color }}>{card.val}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ height: 140, background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: landscapeColor, transition: 'background 0.8s ease' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: `linear-gradient(to top, rgba(${weeklyEstimate > 40 ? '120,50,20' : weeklyEstimate > 25 ? '100,90,30' : '20,100,50'},0.4), transparent)`, transition: 'background 0.8s ease' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>{year} landscape</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
            {weeklyEstimate < 20 ? 'Thriving ecosystem' : weeklyEstimate < 35 ? 'Moderate stress' : 'Significant degradation'}
          </div>
        </div>
      </div>
    </div>
  )
}

export function TransparencyPage() {
  const [openSection, setOpenSection] = useState(null)

  const factors = [
    // ── Energy
    { key: 'grid_uk',    label: 'UK Grid Electricity',
      value: '0.207074 kg/kWh',
      equiv: '1 kWh = 207g CO₂ ≈ 23 smartphone charges (at 0.00886 kg/charge)',
      source: 'DEFRA 2023, UK electricity sheet',
      note: 'UK electricity generated, 2023. Verified from DEFRA 2023 Excel, UK electricity tab. Scotland grid is ~70% renewable — UK national average used as conservative estimate.' },
    { key: 'gas',        label: 'Natural Gas',
      value: '0.20226 kg/kWh',
      equiv: '1 kWh gas = 202g CO₂ ≈ 10 kettle boils (each ~0.02 kWh)',
      source: 'DEFRA 2023, Fuels sheet',
      note: 'Natural gas, kWh Net CV = 0.20226 kg CO₂e. Verified from DEFRA 2023 Fuels sheet row: Natural gas, kWh (Net CV).' },
    // ── Transport
    { key: 'petrol',     label: 'Petrol Car (average)',
      value: '0.16983 kg/km',
      equiv: '1 km = 170g CO₂. Edinburgh→Glasgow (73 km) = 12.4 kg CO₂',
      source: 'DEFRA 2023, Passenger vehicles sheet',
      note: 'Average car, Petrol, kg CO₂e/km. Verified from DEFRA 2023 Passenger vehicles sheet.' },
    { key: 'taxi',      label: 'Taxi / Ride-hailing (Uber)',
      value: '0.16983 kg/km',
      equiv: '1 km taxi = 170g CO₂ — same as petrol car (single occupancy)',
      source: 'DEFRA 2023, Passenger vehicles sheet',
      note: 'Average petrol car used as proxy for taxi/ride-hailing (single occupancy). Same factor as petrol car: 0.16983 kg CO₂e/km.' },
    { key: 'bus',        label: 'Local Bus',
      value: '0.089 kg/km',
      equiv: '1 km bus = 89g CO₂ — 48% less than the same km by petrol car (170g)',
      source: 'DEFRA 2023, SECR kWh pass & delivery vehs sheet',
      note: 'UK average local bus, per passenger km. Low carbon per passenger because of high occupancy.' },
    { key: 'train',     label: 'National Rail',
      value: '0.035 kg/km',
      equiv: '1 km train = 35g CO₂ — 80% less than a petrol car',
      source: 'DEFRA 2023, SECR kWh pass sheet',
      note: 'National rail, per passenger km. 0.035 kg CO₂e/km. Low carbon due to high occupancy and electrification of rail network.' },
    // ── Flights
    { key: 'flight',     label: 'Long-haul Flight (Intl eco + RF)',
      value: '0.20011 kg/km',
      equiv: 'Edinburgh→Shanghai (9,000 km) = 1,801 kg CO₂e — same as driving 10,600 km by petrol car',
      source: 'DEFRA 2023, Business travel-air sheet',
      note: 'Long-haul to/from UK, Economy class, With Radiative Forcing (RF). RF multiplier accounts for contrail formation and high-altitude ozone effects. 9,000 km × 0.20011 = 1,801 kg CO₂e one-way.' },
    // ── Food
    { key: 'beef',       label: 'Beef (per kg food)',
      value: '60.0 kg CO₂e/kg',
      equiv: '200g beef meal = 12.0 kg CO₂e — same as driving 71 km in a petrol car',
      source: 'Poore & Nemecek (2018) Science 360:987',
      note: 'Beef herd, global average across 38,700 commercially viable farms in 119 countries. Land use change is the dominant contributor. Per 200g meal = 0.2 × 60 = 12.0 kg CO₂e.' },
    { key: 'chicken',    label: 'Poultry (per kg food)',
      value: '6.0 kg CO₂e/kg',
      equiv: '200g chicken = 1.2 kg CO₂e — 10× less than the same weight of beef',
      source: 'Poore & Nemecek (2018) Science 360:987',
      note: 'Poultry meat, global average. Non-ruminant livestock — no methane from enteric fermentation. Per 200g meal = 0.2 × 6.0 = 1.2 kg CO₂e.' },
    { key: 'vegetables', label: 'Vegetables (per kg food)',
      value: '0.4 kg CO₂e/kg',
      equiv: '1 kg vegetables = 400g CO₂ — 150× less than the same weight of beef',
      source: 'Poore & Nemecek (2018) Science 360:987',
      note: 'Root vegetables average, global across 119 countries. Lowest carbon food category. Per 200g portion = 0.08 kg CO₂e.' },
    // ── Shopping ─────────────────────────────────────────────────
    { key: 'clothing',   label: 'New clothing (per garment)',
      value: '8.92 kg CO₂e',
      equiv: '1 new garment = 8.92 kg CO₂e — same as driving 53 km by petrol car',
      source: 'DEFRA 2023, Material use sheet',
      note: 'Clothing, Primary material production: 22,310 kg CO₂e/tonne (verified from DEFRA 2023). Per garment assumes 0.4 kg average weight: 22,310 × 0.0004 = 8.92 kg. Re-used clothing: 0.061 kg/garment (152.25 kg/tonne).' },
    { key: 'clothing_reused', label: 'Second-hand clothing (per garment)',
      value: '0.06 kg CO₂e',
      equiv: '1 second-hand garment = 0.06 kg CO₂e — 99% less than new clothing',
      source: 'DEFRA 2023, Material use sheet',
      note: 'Clothing, Re-used: 152.25 kg CO₂e/tonne (verified from DEFRA 2023). Per garment assumes 0.4 kg average weight: 152.25 × 0.0004 = 0.061 kg CO₂e/garment.' },
    // ── Waste
    { key: 'food_waste', label: 'Food waste (landfill vs compost)',
      value: '700 kg CO₂e/tonne (landfill)',
      equiv: 'Landfill = 700 kg CO₂/tonne. Composting = 8.9 kg CO₂/tonne — 79× less',
      source: 'DEFRA 2023, Waste disposal sheet',
      note: 'Organic food waste, Landfill = 700.210 kg CO₂e/tonne (verified). Methane generation from anaerobic decomposition. Composting = 8.912 kg CO₂e/tonne. All values verified from DEFRA 2023 Waste disposal sheet.' },
  ]

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Data sources & methodology</h2>
        <p style={{ color: 'var(--text3)', fontSize: 13, lineHeight: 1.7, maxWidth: 560 }}>
          All emission factors sourced from verified primary datasets. Click any row for detail. Values marked "(est.)" are estimates where no official source exists.
        </p>
      </div>

      <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 1fr 180px', padding: '10px 16px', borderBottom: '0.5px solid var(--border)', fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <span>Category</span><span>Value</span><span>What it means</span><span>Source</span>
        </div>
        {factors.map(f => (
          <div key={f.key}
            onClick={() => setOpenSection(openSection === f.key ? null : f.key)}
            style={{ cursor: 'pointer', borderBottom: '0.5px solid var(--border)', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 1fr 180px', padding: '12px 16px', fontSize: 12 }}>
              <span style={{ color: 'var(--text)', fontWeight: openSection === f.key ? 500 : 400 }}>{f.label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--edinburgh)' }}>{f.value}</span>
              <span style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.4 }}>{f.equiv}</span>
              <span style={{ fontSize: 10, color: 'var(--text3)' }}>{f.source}</span>
            </div>
            {openSection === f.key && (
              <div style={{ padding: '0 16px 14px', fontSize: 11, color: 'var(--text2)', lineHeight: 1.7, background: 'var(--surface2)' }}>{f.note}</div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Methodology</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.7 }}>GHG Protocol framework. All factors market-average and location-based. Flights use DEFRA's radiative forcing multiplier (With RF column).</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Limitations</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.7 }}>Food emissions are global averages across 119 countries (Poore & Nemecek 2018). All DEFRA factors are UK national averages. Results are indicative, not certified.</div>
        </div>
      </div>


    </div>
  )
}
