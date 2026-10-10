import { useState } from 'react'
import { useApp } from '../AppContext'
import { DIET_PROFILES, SHOPPING_PROFILES, WASTE_PROFILES } from '../carbonEngine'

function SliderInput({ label, unit, min, max, step, value, onChange, color = 'var(--green)', description }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div>
          <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
          {description && <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 8 }}>{description}</span>}
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color, fontWeight: 500 }}>
          {step < 1 ? value.toFixed(1) : Math.round(value)} {unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="ep-slider"
        style={{
          width: '100%', height: 4, borderRadius: 2, outline: 'none', cursor: 'pointer',
          WebkitAppearance: 'none',
          background: `linear-gradient(to right, ${color} ${pct}%, var(--surface2) ${pct}%)`,
        }}
      />
    </div>
  )
}

function SelectInput({ label, options, value, onChange, description }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
        {description && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{description}</div>}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {Object.entries(options).map(([key, opt]) => (
          <button key={key} onClick={() => onChange(key)}
            style={{
              padding: '6px 14px', borderRadius: 8,
              border: `0.5px solid ${value === key ? 'var(--border2)' : 'var(--border)'}`,
              background: value === key ? 'var(--surface2)' : 'var(--surface)',
              color: value === key ? 'var(--text)' : 'var(--text3)',
              fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
            }}
            title={opt.description}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const SECTIONS = [
  { id: 'energy',    label: 'Home Energy', icon: '⚡', color: 'var(--blue)' },
  { id: 'transport', label: 'Transport',   icon: '🚗', color: 'var(--amber)' },
  { id: 'flights',   label: 'Flights',     icon: '✈️', color: 'var(--red)' },
  { id: 'lifestyle', label: 'Lifestyle',   icon: '🥗', color: 'var(--green)' },
]

export default function InputsPage() {
  const { inputs, updateInput, results } = useApp()
  const [activeSection, setActiveSection] = useState('energy')

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`
        .ep-slider::-webkit-slider-thumb {
          -webkit-appearance:none; width:14px; height:14px;
          border-radius:50%; background:#fff;
          cursor:pointer; border:2px solid var(--bg);
          transition:transform 0.15s;
        }
        .ep-slider::-webkit-slider-thumb:hover { transform:scale(1.3); }
      `}</style>

      <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', padding: '0 24px', flexShrink: 0 }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            style={{
              padding: '14px 20px', border: 'none',
              borderBottom: `2px solid ${activeSection === s.id ? s.color : 'transparent'}`,
              background: 'transparent',
              color: activeSection === s.id ? 'var(--text)' : 'var(--text3)',
              fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)',
              fontWeight: activeSection === s.id ? 500 : 400,
              transition: 'all 0.15s', display: 'flex', gap: 8, alignItems: 'center',
            }}
          >
            <span>{s.icon}</span>{s.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' }}>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Household size:</span>
          <input type="number" min="1" max="10" value={inputs.numPeople}
            onChange={e => updateInput('numPeople', parseInt(e.target.value) || 1)}
            style={{ width: 48, background: 'var(--surface)', border: '0.5px solid var(--border2)', borderRadius: 6, padding: '4px 8px', color: 'var(--text)', fontSize: 12, textAlign: 'center', fontFamily: 'var(--font-mono)' }}
          />
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>people</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 260px', overflow: 'hidden' }}>
        <div style={{ overflowY: 'auto', padding: '24px 32px' }}>

          {activeSection === 'energy' && <>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 22, lineHeight: 1.7 }}>
              Home energy covers electricity, gas, and oil heating. Values are per household per day.
            </p>
            <SliderInput label="Electricity" unit="kWh/day" min={1} max={50} step={0.5} value={inputs.electricity} onChange={v => updateInput('electricity', v)} color="var(--blue)" description="avg UK home: 8–12 kWh/day" />
            <SliderInput label="Natural Gas" unit="kWh/day" min={0} max={100} step={1} value={inputs.gas} onChange={v => updateInput('gas', v)} color="var(--blue)" description="0 if no gas supply" />
            <SliderInput label="Heating Oil" unit="litres/week" min={0} max={20} step={0.5} value={inputs.heatingOil} onChange={v => updateInput('heatingOil', v)} color="var(--blue)" description="oil-heated homes only" />
            <ResultBox label="Energy subtotal" value={results.breakdown.energy} color="var(--blue)" />
          </>}

          {activeSection === 'transport' && <>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 22, lineHeight: 1.7 }}>
              Enter weekly distances for each mode. Electric cars produce far less CO₂e per km,
              but the saving depends on the city's electricity grid.
            </p>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 10 }}>Car type</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { key: 'petrol', label: 'Petrol', sub: '0.170 kg/km' },
                  { key: 'diesel', label: 'Diesel', sub: '0.163 kg/km' },
                  { key: 'electric', label: 'Electric', sub: '0.037 kg/km*' },
                  { key: 'none', label: 'No car', sub: '—' },
                ].map(opt => (
                  <button key={opt.key} onClick={() => updateInput('carType', opt.key)}
                    style={{
                      flex: 1, padding: '8px 6px', borderRadius: 8,
                      border: `0.5px solid ${inputs.carType === opt.key ? 'rgba(245,166,35,0.5)' : 'var(--border)'}`,
                      background: inputs.carType === opt.key ? 'var(--amber-dim)' : 'var(--surface)',
                      color: inputs.carType === opt.key ? 'var(--amber)' : 'var(--text3)',
                      fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'center', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{opt.label}</div>
                    <div style={{ fontSize: 9, marginTop: 3, opacity: 0.7, fontFamily: 'var(--font-mono)' }}>{opt.sub}</div>
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 5 }}>* Scotland grid factor. EV emissions vary by city.</div>
            </div>
            <SliderInput label="Car km" unit="km/week" min={0} max={500} step={5} value={inputs.carKm} onChange={v => updateInput('carKm', v)} color="var(--amber)" />
            <SliderInput label="Bus" unit="km/week" min={0} max={200} step={5} value={inputs.busKm} onChange={v => updateInput('busKm', v)} color="var(--amber)" description="0.089 kg/km" />
            <SliderInput label="Train" unit="km/week" min={0} max={500} step={10} value={inputs.trainKm} onChange={v => updateInput('trainKm', v)} color="var(--amber)" description="0.035 kg/km — most efficient" />
            <SliderInput label="Tram / Light Rail" unit="km/week" min={0} max={100} step={2} value={inputs.tramKm} onChange={v => updateInput('tramKm', v)} color="var(--amber)" description="0.029 kg/km" />
            <SliderInput label="Subway / Metro" unit="km/week" min={0} max={200} step={5} value={inputs.subwayKm} onChange={v => updateInput('subwayKm', v)} color="var(--amber)" description="0.028 kg/km" />
            <ResultBox label="Transport subtotal" value={results.breakdown.transport} color="var(--amber)" />
          </>}

          {activeSection === 'flights' && <>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 22, lineHeight: 1.7 }}>
              Flights are amortised weekly. A single long-haul return trip can dwarf months of other activity.
              DEFRA applies a ×1.9 radiative forcing multiplier for altitude effects.
            </p>
            <SliderInput label="Short-haul flights" unit="per year" min={0} max={20} step={1} value={inputs.shortFlightsPerYear} onChange={v => updateInput('shortFlightsPerYear', v)} color="var(--red)" description="e.g. UK domestic, Europe — ~800km avg" />
            <SliderInput label="Long-haul flights" unit="per year" min={0} max={10} step={1} value={inputs.longFlightsPerYear} onChange={v => updateInput('longFlightsPerYear', v)} color="var(--red)" description="e.g. intercontinental — ~9,000km avg" />
            <ResultBox label="Flights subtotal (weekly amortised)" value={results.breakdown.flights} color="var(--red)" />
            <div style={{ background: 'var(--red-dim)', border: '0.5px solid rgba(255,92,92,0.2)', borderRadius: 10, padding: '14px 16px', marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--red)', marginBottom: 6 }}>Context</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.6 }}>
                Your {inputs.longFlightsPerYear} long-haul flight{inputs.longFlightsPerYear !== 1 ? 's' : ''} this year
                ≈ {(inputs.longFlightsPerYear * 9000 * 0.195 * 2 / inputs.numPeople).toFixed(0)} kg CO₂e —
                equal to {((inputs.longFlightsPerYear * 9000 * 0.195 * 2 / inputs.numPeople) / 35).toFixed(1)} weeks of UK average non-aviation emissions.
              </div>
            </div>
          </>}

          {activeSection === 'lifestyle' && <>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 22, lineHeight: 1.7 }}>
              Diet, shopping, and waste together represent a large share of household carbon.
              Switching from high-meat to vegan saves ~11 kg CO₂e per week.
            </p>
            <SelectInput label="Diet type" options={DIET_PROFILES} value={inputs.diet} onChange={v => updateInput('diet', v)} description="Weekly food carbon varies 5× between vegan and high-meat diets" />
            <SelectInput label="Consumer shopping" options={SHOPPING_PROFILES} value={inputs.shopping} onChange={v => updateInput('shopping', v)} description="Clothing, electronics, household goods, online orders" />
            <SelectInput label="Waste & recycling" options={WASTE_PROFILES} value={inputs.waste} onChange={v => updateInput('waste', v)} description="Composting and recycling reduce landfill methane emissions" />
            <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginTop: 8 }}>
              {[
                { key: 'diet', label: 'Diet', color: 'var(--green)' },
                { key: 'shopping', label: 'Shopping', color: '#c084fc' },
                { key: 'waste', label: 'Waste', color: 'var(--text3)' },
              ].map(({ key, label, color }) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '0.5px solid var(--border)' }}>
                  <span style={{ color: 'var(--text2)' }}>{label}</span>
                  <span style={{ color, fontFamily: 'var(--font-mono)' }}>{results.breakdown[key].toFixed(2)} kg/week</span>
                </div>
              ))}
            </div>
          </>}

        </div>

        {/* Live summary panel */}
        <div style={{ borderLeft: '0.5px solid var(--border)', overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>All Categories</div>
          {Object.entries(results.breakdown).map(([key, val]) => {
            const colors = { energy: 'var(--blue)', transport: 'var(--amber)', flights: 'var(--red)', diet: 'var(--green)', shopping: '#c084fc', waste: 'var(--text3)' }
            const labels = { energy: '⚡ Energy', transport: '🚗 Transport', flights: '✈️ Flights', diet: '🥗 Diet', shopping: '🛍 Shopping', waste: '♻️ Waste' }
            const pct = results.total > 0 ? (val / results.total * 100) : 0
            return (
              <div key={key} style={{ background: 'var(--surface)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: 'var(--text2)' }}>{labels[key]}</span>
                  <span style={{ fontSize: 11, color: colors[key], fontFamily: 'var(--font-mono)' }}>{val.toFixed(1)}</span>
                </div>
                <div style={{ height: 3, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: colors[key], borderRadius: 2, transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2, textAlign: 'right' }}>{pct.toFixed(0)}%</div>
              </div>
            )
          })}
          <div style={{ background: 'var(--surface2)', border: '0.5px solid var(--border2)', borderRadius: 10, padding: '14px', marginTop: 4 }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 6 }}>TOTAL / WEEK</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: results.total < 25 ? 'var(--green)' : results.total < 45 ? 'var(--amber)' : 'var(--red)' }}>
              {results.total.toFixed(1)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>kg CO₂e</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ResultBox({ label, value, color }) {
  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginTop: 8 }}>
      <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color }}>
        {value.toFixed(2)} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text3)' }}>kg CO₂e / week</span>
      </div>
    </div>
  )
}
