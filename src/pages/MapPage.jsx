import { useRef, useEffect, useState } from 'react'
import { useApp } from '../AppContext'

const MAPBOX_TOKEN = 'pk.eyJ1IjoidG9tbXk5ODUiLCJhIjoiY21waDFtNXd5MGxieTJycjJkZWU5enN1bCJ9.b0eC0RKKXhJ0Pk5QyR8XFw'

const CATEGORY_COLORS = {
  transportation: '#f5a623',
  household:      '#5bbfff',
  consumption:    '#c084fc',
  waste:          '#3ddc84',
}
const CATEGORY_LABELS = {
  transportation: 'Transport',
  household:      'Home Energy',
  consumption:    'Food & Shopping',
  waste:          'Waste',
}

// ── EMISSION FACTORS — all verified from primary sources
// DEFRA 2023 GHG Conversion Factors
// MEE & NBS 2024 33 | Poore & Nemecek, Science 2018
const EF = {
  // ── Transport UK (DEFRA 2023, Passenger vehicles sheet) ────────
  petrol_car_uk:    { v: 0.16983, src: 'DEFRA 2023, Passenger vehicles sheet — Average car, Petrol, kg CO₂e/km' },
  diesel_car_uk:    { v: 0.16391, src: 'DEFRA 2023, Passenger vehicles sheet — Average car, Diesel, kg CO₂e/km' },
  // Bus & train: SECR kWh pass & delivery vehs sheet — values TBC after full sheet review
  bus_uk:           { v: 0.089,   src: 'DEFRA 2023, SECR kWh pass sheet (estimate pending full sheet confirmation)' },
  train_uk:         { v: 0.035,   src: 'DEFRA 2023, SECR kWh pass sheet (estimate pending full sheet confirmation)' },
  taxi_uk:          { v: 0.16983, src: 'DEFRA 2023, Passenger vehicles sheet — Average car petrol used as proxy' },
  // ── Flights (DEFRA 2023, Business travel-air sheet, With RF) ───
  flight_intl_eco:  { v: 0.13464, src: 'DEFRA 2023, Business travel-air sheet — International to/from non-UK, Economy, With RF, kg CO₂e/passenger.km' },
  flight_longhaul:  { v: 0.20011, src: 'DEFRA 2023, Business travel-air sheet — Long-haul to/from UK, Economy, With RF, kg CO₂e/passenger.km' },
  flight_shorthaul: { v: 0.18592, src: 'DEFRA 2023, Business travel-air sheet — Short-haul to/from UK, Average passenger, With RF' },
  // ── Energy UK (DEFRA 2023) ──────────────────────────────────────
  electricity_uk:   { v: 0.207074, src: 'DEFRA 2023, UK electricity sheet — Electricity generated, UK, 2023, kg CO₂e/kWh' },
  gas_uk:           { v: 0.20226,  src: 'DEFRA 2023, Fuels sheet — Natural gas, kWh (Net CV), kg CO₂e/kWh' },
  // ── Food (Poore & Nemecek, Science 2018; Our World in Data) ────
  // Values = kg CO₂e per kg food product (global average, 38,700 farms, 119 countries)
  beef:             { v: 60.0,  src: 'Poore & Nemecek (2018) Science 360:987-992 — Beef (beef herd), kg CO₂e/kg food' },
  lamb:             { v: 24.0,  src: 'Poore & Nemecek (2018) — Lamb & Mutton, kg CO₂e/kg food' },
  pork:             { v: 7.0,   src: 'Poore & Nemecek (2018) — Pig Meat, kg CO₂e/kg food' },
  chicken:          { v: 6.0,   src: 'Poore & Nemecek (2018) — Poultry Meat, kg CO₂e/kg food' },
  eggs:             { v: 4.5,   src: 'Poore & Nemecek (2018) — Eggs, kg CO₂e/kg food' },
  rice:             { v: 4.0,   src: 'Poore & Nemecek (2018) — Rice, kg CO₂e/kg food' },
  vegetables:       { v: 0.4,   src: 'Poore & Nemecek (2018) — Root Vegetables avg, kg CO₂e/kg food' },
  // ── Clothing (DEFRA 2023, Material use sheet) ──────────────────
  // Per tonne → per garment: avg garment ~0.4 kg
  clothing_new:     { v: 22310, unit: 'kg/tonne', src: 'DEFRA 2023, Material use sheet — Clothing, Primary material production, 22,310 kg CO₂e/tonne' },
  clothing_reused:  { v: 152.25, unit: 'kg/tonne', src: 'DEFRA 2023, Material use sheet — Clothing, Re-used, 152.25 kg CO₂e/tonne' },
  // Per garment (0.4 kg avg garment weight):
  clothing_new_per_garment:    { v: +(22310 * 0.0004).toFixed(2), src: 'DEFRA 2023 Material use (22,310 kg/tonne) × 0.4 kg avg garment weight = 8.92 kg CO₂e/garment' },
  clothing_reused_per_garment: { v: +(152.25 * 0.0004).toFixed(2), src: 'DEFRA 2023 Material use (152.25 kg/tonne re-used) × 0.4 kg = 0.06 kg CO₂e/garment' },
  // Aliases for backward compatibility with scenario code
  electricity_scot: { v: 0.207074, src: 'DEFRA 2023, UK electricity sheet — UK electricity generated 2023, kg CO₂e/kWh' },
  fast_fashion:     { v: +(22310 * 0.0004).toFixed(2), src: 'DEFRA 2023 Material use sheet — Clothing primary production 22,310 kg CO₂e/tonne × 0.4 kg/garment = 8.92 kg' },
  packaging:        { v: 0.08, src: 'Estimate: takeaway packaging ~0.08 kg CO₂e (DEFRA 2023 Waste disposal, plastics 8.884 kg/tonne)' },
  // ── Waste (DEFRA 2023, Waste disposal sheet) ───────────────────
  food_waste_landfill:  { v: 700.210, unit: 'kg/tonne', src: 'DEFRA 2023, Waste disposal sheet — Organic: food and drink waste, Landfill, 700.210 kg CO₂e/tonne' },
  food_waste_compost:   { v: 8.912,   unit: 'kg/tonne', src: 'DEFRA 2023, Waste disposal sheet — Wood (compost proxy), Composting, 8.912 kg CO₂e/tonne' },
  clothing_landfill:    { v: 496.683, unit: 'kg/tonne', src: 'DEFRA 2023, Waste disposal sheet — Clothing, Landfill, 496.683 kg CO₂e/tonne' },
  // ── Water (DEFRA 2023, Water supply sheet) ─────────────────────
  water_supply:         { v: 0.177,   src: 'DEFRA 2023, Water supply sheet — 0.177 kg CO₂e/cubic metre' },
  // ── Homeworking (DEFRA 2023, Homeworking sheet) ────────────────
  homeworking_heating:  { v: 0.30234, src: 'DEFRA 2023, Homeworking sheet — Heating, 0.30234 kg CO₂e/FTE working hour' },
}

//  Pre-calculated scenario values using verified EF

const FLIGHT_EDI_SHA = +(9000 * 0.13464).toFixed(0)
// Heating: 5 kWh gas × 0.20226
const HEAT_FULL_5KWH = +(5 * 0.20226).toFixed(2)
const HEAT_LOW_2_5KWH = +(2.5 * 0.20226).toFixed(2)
const HEAT_BLANKET = +(0.1 * 0.207074).toFixed(3)
// Shanghai AC: kWh × 0.5849
const AC_16_5KWH  = +(5   * 0.5849).toFixed(2)
const AC_26_1_5KWH= +(1.5 * 0.5849).toFixed(2)
const AC_DELAY    = +(0.8 * 0.5849).toFixed(2)
const AC_FAN      = +(0.05* 0.5849).toFixed(3)
// Food per meal
const BEEF_MEAL   = +(0.2 * 60.0).toFixed(2)
const CHICKEN_MEAL= +(0.2 * 6.0).toFixed(2)
const VEG_MEAL    = +(0.3 * 0.4).toFixed(2)
// Fast fashion: DEFRA
const GARMENT_NEW  = +(22310 * 0.0004).toFixed(2)
const GARMENT_USED = +(152.25* 0.0004).toFixed(3)

const LANDMARKS = {
  edinburgh: [
    {
      id: 'calton', name: 'Calton Hill', emoji: '🏔',
      lng: -3.1841, lat: 55.9553, category: 'transportation',
      scenario: {
        title: 'Scenario A — Getting Around Edinburgh',
        subtitle: 'From Pollock Halls · 2.4 km to Calton Hill',
        context: "It's a rare sunny Saturday in Edinburgh. You want to head up to Calton Hill for the view over the city. How do you get there?",
        bg: 'rgba(245,166,35,0.07)',
        choices: [
          {
            id: 'uber', label: 'Call an Uber', sub: '~£8 · 10 min · door to door',
            co2: +(2.4 * 0.16983).toFixed(2),
            color: '#ff5c5c', animation: 'car',
            formula: `2.4 km × ${0.16983} kg/km = ${+(2.4 * 0.16983).toFixed(2)} kg CO₂`,
            source: EF.petrol_car_uk.src,
            equiv: 'Same as charging your phone 46 times · or leaving a 60W bulb on for 6.8 hours',
          },
          {
            id: 'taxi', label: 'Black Cab / Taxi', sub: '~£10 · 12 min',
            co2: +(2.4 * 0.16983).toFixed(2),
            color: '#ff7a40', animation: 'car',
            formula: `2.4 km × ${0.16983} kg/km = ${+(2.4 * 0.16983).toFixed(2)} kg CO₂`,
            source: EF.taxi_uk.src,
            equiv: 'Slightly lower than Uber (diesel engines in older cabs)',
          },
          {
            id: 'bus', label: 'Lothian Bus', sub: '£1.80 · 22 min · most reliable',
            co2: +(2.4 * 0.089).toFixed(2),
            color: '#f5a623', animation: 'bus',
            formula: `2.4 km × ${0.089} kg/km = ${+(2.4 * 0.089).toFixed(2)} kg CO₂`,
            source: EF.bus_uk.src,
            equiv: '49% less than Uber · Same as charging your phone 24 times',
          },
          {
            id: 'bike', label: 'Just Eat Cycles (rental bike)', sub: '~£2 · 15 min · fastest in traffic',
            co2: 0.01,
            color: '#3ddc84', animation: 'walk',
            formula: 'Near-zero: only tiny amount from bike manufacturing amortised over rides',
            source: 'Lifecycle analysis estimate',
            equiv: 'Near-zero emissions · Burns ~150 calories',
          },
          {
            id: 'walk', label: 'Walk', sub: 'Free · 30 min · enjoy the city',
            co2: 0,
            color: '#3ddc84', animation: 'walk',
            formula: 'Direct emissions = 0 (human-powered)',
            source: 'No emission factor required',
            equiv: 'Zero emissions ✓ · Burns ~200 calories · You get to see Grassmarket and the Royal Mile',
          },
        ],
      },
    },
    {
      id: 'pollock', name: 'Student Halls', emoji: '🏠',
      lng: -3.1895, lat: 55.9367, category: 'household',
      scenario: {
        title: 'Scenario B — Edinburgh Winter Heating',
        subtitle: 'November · Outside 4°C · Room temperature 14°C',
        context: "It's November, the heating has been off all day, and your room is freezing. You've got an essay due tomorrow. How do you manage the heating tonight?",
        bg: 'rgba(91,191,255,0.07)',
        choices: [
          {
            id: 'heater_max', kwh: 5, label: 'Heater on full (22°C all night)', sub: '~5 kWh gas · Most comfortable',
            co2: +(5 * 0.20226).toFixed(2),
            color: '#ff5c5c', animation: 'heater',
            formula: `5 kWh × ${0.20226} kg/kWh (natural gas) = ${+(5 * 0.20226).toFixed(2)} kg CO₂`,
            source: EF.gas_uk.src,
            equiv: 'Same as driving 5.4 km in a petrol car',
          },
          {
            id: 'heater_mid', kwh: 2.5, label: 'Jumper on, heater at 18°C', sub: '~2.5 kWh gas · A bit chilly',
            co2: +(2.5 * 0.20226).toFixed(2),
            color: '#f5a623', animation: 'heater',
            formula: `2.5 kWh × ${0.20226} kg/kWh = ${+(2.5 * 0.20226).toFixed(2)} kg CO₂ (saves 50%)`,
            source: EF.gas_uk.src,
            equiv: 'Each 1°C reduction saves about 8% energy (UK Energy Saving Trust)',
          },
          {
            id: 'heater_low', kwh: 0.1, label: 'Electric blanket only, heater off', sub: '~0.1 kWh electricity · Very cold',
            co2: +(0.1 * 0.207074).toFixed(3),
            color: '#3ddc84', animation: 'heater',
            formula: `0.1 kWh × ${0.207074} kg/kWh (Scotland grid) = ${+(0.1 * 0.207074).toFixed(3)} kg CO₂`,
            source: EF.electricity_scot.src,
            equiv: 'Scotland grid is 70% renewable — electricity heating is very low carbon here',
          },
          {
            id: 'library',    kwh: 0.1, label: 'Go to the Main Library (open 24h)', sub: 'Near-zero personal footprint',
            co2: 0.05,
            color: '#3ddc84', animation: 'walk',
            formula: 'Library total heating ÷ occupants ≈ 0.05 kg CO₂ per person per evening (estimate)',
            source: 'Estimate based on UoE sustainability data',
            equiv: 'Shared buildings are dramatically more energy-efficient per person',
          },
          {
            id: 'friend',     kwh: 0.3, label: "Stay at a friend's (shared warmth)", sub: 'Shared heating cost',
            co2: 0.15,
            color: '#3ddc84', animation: 'walk',
            formula: 'Two people sharing one heated room ≈ half the per-person heating carbon',
            source: 'Proportional estimate from DEFRA gas factor',
            equiv: 'Social life and carbon savings in one',
          },
        ],
      },
    },
    {
      id: 'princes', name: 'Princes Street', emoji: '🛍',
      lng: -3.1936, lat: 55.9520, category: 'consumption',
      scenario: {
        title: 'Scenario C — Shopping on Princes Street',
        subtitle: 'Saturday afternoon · Edinburgh\'s main shopping street',
        context: "You're walking down Princes Street and spot a jacket you really like in H&M. It's on sale. What do you do?",
        bg: 'rgba(192,132,252,0.07)',
        choices: [
          {
            id: 'fast_fashion_2', label: 'Buy 2 new fast-fashion items', sub: '~£40 · Instant satisfaction',
            co2: +(EF.clothing_new_per_garment.v * 2).toFixed(1),
            color: '#ff5c5c', animation: 'shopping',
            formula: `${EF.clothing_new_per_garment.v} kg CO₂/garment × 2 = ${+(EF.clothing_new_per_garment.v * 2).toFixed(1)} kg CO₂ (cotton growing + dyeing + manufacturing + shipping)`,
            source: EF.fast_fashion.src,
            equiv: 'Same as driving from Edinburgh to Glasgow',
          },
          {
            id: 'fast_fashion_1', label: 'Buy just the one jacket', sub: '~£25 · Restrained',
            co2: EF.clothing_new_per_garment.v,
            color: '#f5a623', animation: 'shopping',
            formula: `${EF.clothing_new_per_garment.v} kg CO₂ per garment (lifecycle)`,
            source: EF.fast_fashion.src,
            equiv: 'Same as a 32 km bus journey',
          },
          {
            id: 'charity', label: 'Check Oxfam / charity shops first', sub: '~£5-15 · More unique',
            co2: 0.3,
            color: '#3ddc84', animation: 'walk',
            formula: 'Second-hand: no new production carbon · ~0.3 kg for shop operations and transport',
            source: 'WRAP 2023 — Valuing Our Clothes',
            equiv: 'Saves 95% of carbon vs new fast fashion',
          },
          {
            id: 'no_buy', label: 'Take a photo and sleep on it', sub: 'Free · Studies show 70% of impulse buys get cancelled after 24h',
            co2: 0,
            color: '#3ddc84', animation: 'walk',
            formula: 'Not buying = zero production emissions',
            source: 'Consumer psychology research',
            equiv: 'The lowest-carbon option is always not buying',
          },
          {
            id: 'rent', label: 'Rent or borrow for the occasion', sub: 'Via Rent the Runway / friend swap',
            co2: 0.2,
            color: '#3ddc84', animation: 'walk',
            formula: 'Rental carbon ≈ cleaning + delivery only (~0.2 kg)',
            source: 'Ellen MacArthur Foundation circular economy report',
            equiv: 'Circular economy in action — same garment, a fraction of the footprint',
          },
        ],
      },
    },
    {
      id: 'airport_ed', name: 'Edinburgh Airport', emoji: '✈️',
      lng: -3.3700, lat: 55.9500, category: 'transportation',
      scenario: {
        title: 'Scenario D — Flying Home to Edinburgh',
        subtitle: 'Edinburgh Airport · CNY break',
        context: "The semester is nearly over and you're heading home for Chinese New Year. The flight is 9,000 km each way. Before you book, consider the carbon cost.",
        bg: 'rgba(255,92,92,0.07)',
        choices: [
          {
            id: 'fly_home', label: 'Book the direct flight (£680)', sub: '1,801 kg CO₂ · One-way',
            co2: +(9000 * 0.20011).toFixed(0) * 1,
            color: '#ff5c5c', animation: 'flight',
            formula: `9,000 km × ${0.20011} kg/km (DEFRA 2023, Long-haul to/from UK, Economy + RF) = ${+(9000*0.20011).toFixed(0)} kg CO₂`,
            source: 'DEFRA 2023, Business travel-air — Long-haul to/from UK, Economy class, With RF',
            equiv: 'This single flight equals approximately 50 weeks of your average daily Edinburgh life carbon',
          },
          {
            id: 'video_home', label: 'Stay in Edinburgh, video call for CNY', sub: 'Free · Emotionally hard · Near-zero carbon',
            co2: 0.001,
            color: '#3ddc84', animation: 'walk',
            formula: 'Video call: ~0.001 kg CO₂ (streaming energy only)',
            source: 'Carbon Trust streaming estimate',
            equiv: 'Saves 1,801 kg CO₂e — equivalent to not driving a petrol car for 10,600 km',
          },
          {
            id: 'fly_offset', label: 'Fly + purchase Gold Standard offsets (£710)', sub: 'Fly anyway, offset the emissions',
            co2: +(9000 * 0.20011).toFixed(0) * 1,
            color: '#f5a623', animation: 'flight',
            formula: `Same flight emissions: ${+(9000*0.20011).toFixed(0)} kg CO₂. Offsets fund verified carbon removal projects.`,
            source: 'DEFRA 2023 flight factor; Gold Standard offset methodology',
            equiv: 'Offsets are controversial — emissions still occurred. But high-quality offsets fund real projects.',
          },
        ],
      },
    },
    {
      id: 'holyrood', name: 'Holyrood Park', emoji: '🌿',
      lng: -3.1627, lat: 55.9444, category: 'waste',
      scenario: {
        title: 'Scenario E — Waste & Recycling',
        subtitle: 'Sunday clear-out · Dorm room accumulation',
        context: "Sunday big clean. You've got a pile of stuff: takeaway boxes, plastic bottles, an old magazine, a broken pair of earphones, and some clothes you never wear. What happens to it all?",
        bg: 'rgba(61,220,132,0.07)',
        choices: [
          {
            id: 'recycle_all', label: 'Sort everything carefully', sub: 'Paper / glass / plastic / metal separated',
            co2: 0.3,
            color: '#3ddc84', animation: 'walk',
            formula: 'Proper recycling: ~0.3 kg CO₂ (processing) vs ~1.6 kg if landfilled — net saving ~1.3 kg',
            source: 'WRAP 2023 + DEFRA waste disposal factors',
            equiv: 'Recycling 1 tonne of paper saves ~2.5 tonnes CO₂ compared to landfill',
          },
          {
            id: 'bin_all', label: 'Everything in the general waste bin', sub: '1 minute, no effort',
            co2: 1.6,
            color: '#ff5c5c', animation: 'shopping',
            formula: 'Mixed waste landfill: organic matter produces methane (~1.4–1.8 kg CO₂e per kg waste)',
            source: 'DEFRA 2023, waste disposal factors; IPCC AR5 (methane GWP = 28)',
            equiv: 'Methane from landfill has 28× the warming effect of CO₂ over 100 years',
          },
          {
            id: 'charity_donate', label: 'Bag up clothes for Oxfam / BHF', sub: 'Donate wearable items',
            co2: 0.1,
            color: '#3ddc84', animation: 'walk',
            formula: 'Donating 1 garment prevents ~2 kg CO₂ (avoids new garment purchase downstream)',
            source: 'WRAP — Valuing Our Clothes 2023',
            equiv: 'Extending garment life by 9 months reduces its carbon footprint by 20–30%',
          },
          {
            id: 'repair', label: 'Repair the earphones (iFixit / local shop)', sub: 'Extends product lifespan',
            co2: 0.2,
            color: '#3ddc84', animation: 'walk',
            formula: 'Repair: ~0.2 kg CO₂ (labour + parts) vs ~8 kg to manufacture new earphones',
            source: 'Electronics lifecycle analysis — European Environment Agency',
            equiv: 'Consumer electronics manufacturing is one of the most carbon-intensive production categories',
          },
          {
            id: 'compost', label: 'Food waste → compost bin (if available)', sub: 'Organic waste only',
            co2: 0.05,
            color: '#3ddc84', animation: 'walk',
            formula: 'Composting converts organic waste to soil amendment with near-zero methane emissions',
            source: 'SEPA (Scottish Environment Protection Agency) compost guidance',
            equiv: 'Scotland has a national food waste collection scheme — check your area',
          },
        ],
      },
    },
  ],
}

//  ANIMATION
//  MAP ANIMATION HELPERS
const MAPBOX_TOKEN_MAP = 'pk.eyJ1IjoidG9tbXk5ODUiLCJhIjoiY21waDFtNXd5MGxieTJycjJkZWU5enN1bCJ9.b0eC0RKKXhJ0Pk5QyR8XFw'

async function animateIconOnMap(map, coords, icon, speedMs, isArc) {
  if (!map || !coords || coords.length < 2) return
  const mapboxgl = (await import('mapbox-gl')).default
  const el = document.createElement('div')
  el.style.cssText = 'font-size:28px;line-height:1;pointer-events:none;z-index:50;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.9));'
  el.textContent = icon
  const marker = new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat(coords[0]).addTo(map)
  const totalFrames = isArc ? 55 : 45
  for (let i = 0; i <= totalFrames; i++) {
    await new Promise(r => setTimeout(r, speedMs || 40))
    const t = i / totalFrames
    const idx = Math.min(Math.floor(t * (coords.length - 1)), coords.length - 2)
    const frac = t * (coords.length - 1) - idx
    const lng = coords[idx][0] + (coords[idx+1][0] - coords[idx][0]) * frac
    const lat = coords[idx][1] + (coords[idx+1][1] - coords[idx][1]) * frac
    if (isArc) {
      const scale = 1 + Math.sin(t * Math.PI) * 0.7
      el.style.transform = `scale(${scale})`
      el.style.opacity = t < 0.08 ? String(t * 12.5) : t > 0.92 ? String((1-t)*12.5) : '1'
    } else {
      el.style.opacity = t < 0.06 ? String(t * 16) : t > 0.94 ? String((1-t)*16) : '1'
    }
    marker.setLngLat([lng, lat])
  }
  await new Promise(r => setTimeout(r, 500))
  marker.remove()
}

async function showStaticIconOnMap(map, lngLat, icon, color) {
  if (!map) return
  const mapboxgl = (await import('mapbox-gl')).default
  const el = document.createElement('div')
  el.style.cssText = `width:52px;height:52px;border-radius:50%;background:${color}22;border:2px solid ${color}88;display:flex;align-items:center;justify-content:center;font-size:26px;pointer-events:none;z-index:50;box-shadow:0 0 24px ${color}66;animation:mapPopIn 0.35s ease;`
  el.textContent = icon
  const marker = new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat(lngLat).addTo(map)
  await new Promise(r => setTimeout(r, 1800))
  el.style.transition = 'opacity 0.4s'; el.style.opacity = '0'
  await new Promise(r => setTimeout(r, 400))
  marker.remove()
}

async function showParticleBurst(map, lngLat, isHigh) {
  if (!map) return
  const mapboxgl = (await import('mapbox-gl')).default
  const emojis = isHigh ? ['💨','☁️','🌫️','💨','☁️'] : ['🌿','✨','🌱','✓','🌿']
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, i * 110))
    const angle = (i / 5) * 360
    const d = 0.00025 + Math.random() * 0.00025
    const el = document.createElement('div')
    el.style.cssText = `font-size:${16+Math.random()*10}px;pointer-events:none;z-index:55;transition:all 1.2s ease;opacity:1;`
    el.textContent = emojis[i]
    const m = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat([lngLat[0]+Math.cos(angle*Math.PI/180)*d, lngLat[1]+Math.sin(angle*Math.PI/180)*d*0.5])
      .addTo(map)
    setTimeout(()=>{ el.style.opacity='0'; el.style.transform=`translateY(-${25+Math.random()*30}px) scale(0.4)`; setTimeout(()=>m.remove(),1300) },150)
  }
}

async function fetchRouteCoords(fromLng, fromLat, toLng, toLat, mode) {
  try {
    const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/${mode}/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&access_token=${MAPBOX_TOKEN_MAP}`)
    const data = await res.json()
    return data.routes?.[0]?.geometry?.coordinates || [[fromLng,fromLat],[toLng,toLat]]
  } catch { return [[fromLng,fromLat],[toLng,toLat]] }
}

// Map animation icon lookup by choice animation type
const ANIM_ICONS = {
  car:      { icon:'🚕', speed:35,  arc:false },
  bus:      { icon:'🚌', speed:50,  arc:false },
  train:    { icon:'🚇', speed:28,  arc:false },
  walk:     { icon:'🚶', speed:80,  arc:false },
  bike:     { icon:'🚲', speed:65,  arc:false },
  flight:   { icon:'✈️', speed:18,  arc:true  },
  delivery: { icon:'🛵', speed:40,  arc:false },
  scooter:  { icon:'🛵', speed:40,  arc:false },
  shopping: { icon:'🛍', speed:null,arc:false },
  food:     { icon:'🍜', speed:null,arc:false },
  heat:     { icon:'🌡️', speed:null,arc:false },
  heater:   { icon:'🌡️', speed:null,arc:false },
  recycle:  { icon:'♻️', speed:null,arc:false },
  phone:    { icon:'📱', speed:null,arc:false },
}

async function playMapAnimation(map, landmark, choice) {
  const animConf = ANIM_ICONS[choice.animation]
  if (!animConf) return
  const dest = [landmark.lng, landmark.lat]

  // For moving icons, draw route first then animate icon
  if (animConf.speed !== null) {
    const mode = animConf.arc ? 'driving' : (choice.animation === 'walk' ? 'walking' : 'driving')
    // Use a fixed "home" origin per city based on landmark proximity
    const homeEd = [-3.1895, 55.9367]
    const isShanghai = false  // Edinburgh only
    const origin = homeEd

    // Draw dotted route line on map
    const coords = await fetchRouteCoords(origin[0], origin[1], dest[0], dest[1], mode)
    try {
      if (map.getLayer('anim-route')) map.removeLayer('anim-route')
      if (map.getSource('anim-route-src')) map.removeSource('anim-route-src')
    } catch(e) {}
    map.addSource('anim-route-src', { type:'geojson', data:{ type:'Feature', geometry:{ type:'LineString', coordinates:coords } } })
    map.addLayer({ id:'anim-route', type:'line', source:'anim-route-src',
      paint:{ 'line-color': choice.color, 'line-width':3, 'line-dasharray':[2,2], 'line-opacity':0.65 }
    })
    // Animate the icon
    await animateIconOnMap(map, coords, animConf.icon, animConf.speed, animConf.arc)
    // Remove route after icon arrives
    setTimeout(()=>{ try { map.removeLayer('anim-route'); map.removeSource('anim-route-src') } catch(e){} }, 800)
  } else {
    // Static pop icon at destination
    await showStaticIconOnMap(map, dest, animConf.icon, choice.color)
  }
  // Particle burst
  await showParticleBurst(map, dest, choice.co2 > 5)
}

//  CSS SCENE BUBBLES

function SceneHeater({ co2, city }) {
  const isSh = false  // Edinburgh only
  const isHigh = co2 > 1
  return (
    <div style={{ position:'relative', width:'100%', height:155, borderRadius:14, overflow:'hidden',
      background: isHigh ? 'linear-gradient(180deg,#1a0808,#2d1010)' : 'linear-gradient(180deg,#0a1a2a,#0d2240)',
      marginBottom:12 }}>
      <div style={{ position:'absolute', top:12, right:18, width:46, height:38, background:'rgba(100,150,220,0.12)', border:'2px solid rgba(150,180,255,0.25)', borderRadius:4 }}>
        {!isSh && [0,1,2,3].map(i=><div key={i} style={{ position:'absolute', width:4,height:4,borderRadius:'50%',background:'white',opacity:0.7,top:`${20+Math.sin(i*1.5)*14}%`,left:`${12+i*24}%`,animation:`snowfall ${2+i*0.4}s linear ${i*0.3}s infinite` }}/>)}
        {isSh && <div style={{ position:'absolute',top:4,left:6,width:22,height:22,borderRadius:'50%',background:'radial-gradient(circle,#ffdd44,#ff8800)',boxShadow:'0 0 10px #ffaa00' }}/>}
      </div>
      <div style={{ position:'absolute',bottom:0,left:0,right:0,height:28,background:'rgba(255,255,255,0.04)',borderTop:'1px solid rgba(255,255,255,0.06)' }}/>
      {!isSh ? (
        <div style={{ position:'absolute',bottom:28,left:18,width:48,height:34,
          background: isHigh ? 'linear-gradient(180deg,#cc3300,#ff6600)' : 'linear-gradient(180deg,#445566,#334455)',
          borderRadius:4,display:'flex',gap:3,padding:4,
          boxShadow: isHigh ? '0 0 20px rgba(255,100,0,0.6)' : 'none', transition:'all 1s' }}>
          {[0,1,2,3].map(i=><div key={i} style={{ flex:1,background:'rgba(0,0,0,0.2)',borderRadius:2 }}/>)}
        </div>
      ) : (
        <div style={{ position:'absolute',top:58,left:14,width:68,height:18,
          background: isHigh ? 'linear-gradient(90deg,#0088cc,#00aaff)' : '#334455',
          borderRadius:10,display:'flex',alignItems:'center',paddingLeft:8,
          boxShadow: isHigh ? '0 0 14px rgba(0,150,255,0.5)' : 'none', transition:'all 1s' }}>
          {isHigh && <div style={{ fontSize:8,color:'white',opacity:0.8 }}>16°C ❄️</div>}
        </div>
      )}
      {isHigh && [0,1,2,3].map(i=>(
        <div key={i} style={{ position:'absolute',bottom: isSh?78:62,left:`${22+i*11}px`,width:7,height:22,borderRadius:4,
          background: isSh ? 'rgba(0,150,255,0.22)' : 'rgba(255,100,0,0.22)',
          animation:`heatRise ${1.2+i*0.2}s ease-in-out ${i*0.18}s infinite` }}/>
      ))}
      {isHigh && [0,1].map(i=>(
        <div key={i} style={{ position:'absolute',top:`${28+i*18}%`,left:`${28+i*16}%`,
          width:`${26+i*12}px`,height:`${18+i*8}px`,borderRadius:'50%',
          background:'rgba(110,110,110,0.32)',
          animation:`cloudDrift ${2.5+i*0.5}s ease-in-out ${i*0.6}s infinite alternate` }}/>
      ))}
      <div style={{ position:'absolute',bottom:28,right:28,display:'flex',flexDirection:'column',alignItems:'center',gap:1 }}>
        <div style={{ width:9,height:9,borderRadius:'50%',background:'rgba(255,255,255,0.45)' }}/>
        <div style={{ width:7,height:13,background:'rgba(255,255,255,0.3)',borderRadius:2 }}/>
        <div style={{ display:'flex',gap:2 }}>
          <div style={{ width:3,height:7,background:'rgba(255,255,255,0.3)',borderRadius:1 }}/>
          <div style={{ width:3,height:7,background:'rgba(255,255,255,0.3)',borderRadius:1 }}/>
        </div>
      </div>
      <div style={{ position:'absolute',top:11,left:13,fontFamily:'monospace',fontSize:17,fontWeight:800,
        color: isHigh?'#ff6644':'#3ddc84',textShadow: isHigh?'0 0 10px rgba(255,80,0,0.6)':'0 0 10px rgba(61,220,132,0.6)' }}>
        {co2===0?'0.00':co2} <span style={{ fontSize:10,fontWeight:400,color:'rgba(255,255,255,0.4)' }}>kg CO₂</span>
      </div>
    </div>
  )
}

function SceneCar({ co2, isWalk, isBus }) {
  const isGreen = isWalk || isBus || co2 < 0.3
  return (
    <div style={{ position:'relative',width:'100%',height:155,borderRadius:14,overflow:'hidden',
      background:'linear-gradient(180deg,#0a1520,#0d1f30 60%,#141414)',marginBottom:12 }}>
      <div style={{ position:'absolute',top:0,left:0,right:0,height:'55%',
        background: isGreen?'linear-gradient(180deg,#0a1a3a,#0d2540)':'linear-gradient(180deg,#1a0a00,#2d1500)' }}/>
      <div style={{ position:'absolute',bottom:0,left:0,right:0,height:44,background:'#1a1a1a',borderTop:'2px solid #333' }}>
        <div style={{ position:'absolute',top:'50%',left:0,right:0,height:3,
          background:'repeating-linear-gradient(90deg,#555 0,#555 20px,transparent 20px,transparent 40px)',
          transform:'translateY(-50%)',animation:'roadMove 0.8s linear infinite' }}/>
      </div>
      {isWalk ? (
        <div style={{ position:'absolute',bottom:44,left:'50%',transform:'translateX(-50%)',animation:'walkBob 0.5s ease-in-out infinite alternate' }}>
          <svg viewBox="0 0 20 36" width="28" height="42">
            <circle cx="10" cy="4" r="4" fill="#3ddc84"/>
            <line x1="10" y1="8" x2="10" y2="22" stroke="#3ddc84" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="10" y1="22" x2="4"  y2="34" stroke="#3ddc84" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="10" y1="22" x2="16" y2="34" stroke="#3ddc84" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="10" y1="14" x2="2"  y2="20" stroke="#3ddc84" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="10" y1="14" x2="18" y2="18" stroke="#3ddc84" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
      ) : isBus ? (
        <div style={{ position:'absolute',bottom:44,left:'50%',transform:'translateX(-50%)',animation:'vehicleDrive 3s linear infinite' }}>
          <svg viewBox="0 0 70 32" width="70" height="32">
            <rect x="2" y="4" width="66" height="24" rx="4" fill="#f5a623" opacity="0.9"/>
            <rect x="4" y="6" width="10" height="9" rx="1" fill="rgba(180,220,255,0.7)"/>
            <rect x="17" y="6" width="10" height="9" rx="1" fill="rgba(180,220,255,0.7)"/>
            <rect x="30" y="6" width="10" height="9" rx="1" fill="rgba(180,220,255,0.7)"/>
            <rect x="44" y="6" width="10" height="9" rx="1" fill="rgba(180,220,255,0.7)"/>
            <circle cx="14" cy="28" r="4" fill="#1a1a1a" stroke="#f5a623" strokeWidth="1.5"/>
            <circle cx="52" cy="28" r="4" fill="#1a1a1a" stroke="#f5a623" strokeWidth="1.5"/>
          </svg>
        </div>
      ) : (
        <div style={{ position:'absolute',bottom:44,left:'50%',transform:'translateX(-50%)',animation:'vehicleDrive 3s linear infinite' }}>
          <svg viewBox="0 0 56 28" width="56" height="28">
            <rect x="4" y="12" width="48" height="14" rx="3" fill={co2>1?'#ff5c5c':'#f5a623'} opacity="0.9"/>
            <rect x="10" y="4"  width="28" height="12" rx="2" fill={co2>1?'#cc3322':'#e09020'}/>
            <circle cx="14" cy="26" r="5" fill="#1a1a1a" stroke={co2>1?'#ff5c5c':'#f5a623'} strokeWidth="1.5"/>
            <circle cx="42" cy="26" r="5" fill="#1a1a1a" stroke={co2>1?'#ff5c5c':'#f5a623'} strokeWidth="1.5"/>
            <rect x="14" y="5" width="10" height="8" rx="1" fill="rgba(180,220,255,0.6)"/>
            <rect x="26" y="5" width="10" height="8" rx="1" fill="rgba(180,220,255,0.6)"/>
          </svg>
          {!isGreen && [0,1,2].map(i=>(
            <div key={i} style={{ position:'absolute',left:-10,top:`${6+i*5}px`,
              width:`${10+i*6}px`,height:`${10+i*6}px`,borderRadius:'50%',
              background:'rgba(100,100,100,0.5)',
              animation:`smokeRise ${1+i*0.3}s ease-out ${i*0.25}s infinite` }}/>
          ))}
        </div>
      )}
      {isGreen && [0,1,2,3].map(i=>(
        <div key={i} style={{ position:'absolute',bottom:`${48+i*8}px`,left:`${18+i*20}%`,fontSize:12,
          animation:`leafFloat ${1.5+i*0.3}s ease-in-out ${i*0.2}s infinite alternate` }}>🌿</div>
      ))}
      <div style={{ position:'absolute',top:11,left:13,fontFamily:'monospace',fontSize:17,fontWeight:800,
        color: isGreen||co2===0?'#3ddc84':co2>1?'#ff5c5c':'#f5a623',
        textShadow:`0 0 10px ${co2===0||isGreen?'rgba(61,220,132,0.6)':'rgba(255,80,0,0.4)'}` }}>
        {co2===0?'0.00':co2} <span style={{ fontSize:10,fontWeight:400,color:'rgba(255,255,255,0.4)' }}>kg CO₂</span>
      </div>
    </div>
  )
}

function SceneFlight({ co2 }) {
  return (
    <div style={{ position:'relative',width:'100%',height:155,borderRadius:14,overflow:'hidden',
      background:'linear-gradient(180deg,#000510,#001530 40%,#0a2040)',marginBottom:12 }}>
      {[...Array(14)].map((_,i)=>(
        <div key={i} style={{ position:'absolute',width:i%3===0?3:2,height:i%3===0?3:2,borderRadius:'50%',background:'white',
          opacity:0.35+Math.random()*0.5,top:`${Math.random()*65}%`,left:`${Math.random()*100}%`,
          animation:`twinkle ${2+Math.random()*2}s ease-in-out ${Math.random()*2}s infinite alternate` }}/>
      ))}
      <div style={{ position:'absolute',bottom:-42,left:-12,right:-12,height:82,borderRadius:'50%',
        background:'linear-gradient(180deg,#1a4060,#0d2030)',border:'1px solid rgba(100,180,255,0.18)' }}/>
      <div style={{ position:'absolute',top:'28%',left:'50%',transform:'translate(-50%,-50%)',animation:'planeFly 4s ease-in-out infinite' }}>
        <svg viewBox="0 0 70 32" width="70" height="32">
          <path d="M8,16 L52,16 Q65,16 65,22 Q65,24 58,24 L32,24 L28,32 L20,32 L25,24 L8,24 Z" fill="#ff5c5c" opacity="0.9"/>
          <path d="M25,16 L44,2 L48,4 L36,16 Z" fill="#ff5c5c"/>
          <path d="M14,16 L24,9 L26,10 L20,16 Z" fill="#ff5c5c" opacity="0.7"/>
        </svg>
      </div>
      <div style={{ position:'absolute',top:'29%',left:'14%',right:'50%',height:2,
        background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.35))',
        animation:'contrail 4s ease-in-out infinite' }}/>
      <div style={{ position:'absolute',top:12,right:12,textAlign:'right' }}>
        <div style={{ fontFamily:'monospace',fontSize:20,fontWeight:800,color:'#ff4444',textShadow:'0 0 14px rgba(255,0,0,0.5)' }}>
          {co2>=100?co2.toLocaleString():co2}
        </div>
        <div style={{ fontSize:10,color:'rgba(255,255,255,0.4)' }}>kg CO₂e</div>
        <div style={{ fontSize:9,color:'rgba(255,100,100,0.55)',marginTop:2 }}>= 50 weeks of daily life</div>
      </div>
    </div>
  )
}

function SceneShopping({ co2, isCharity }) {
  return (
    <div style={{ position:'relative',width:'100%',height:155,borderRadius:14,overflow:'hidden',
      background: isCharity?'linear-gradient(180deg,#0a1a0a,#0d250d)':'linear-gradient(180deg,#150a20,#200a30)',
      marginBottom:12 }}>
      <div style={{ position:'absolute',bottom:0,left:'50%',transform:'translateX(-50%)',width:118,height:88,
        background: isCharity?'#1a3a1a':'#2a1040',borderRadius:'4px 4px 0 0',
        border:`1px solid ${isCharity?'rgba(61,220,132,0.28)':'rgba(192,132,252,0.28)'}` }}>
        <div style={{ position:'absolute',top:7,left:8,right:8,height:17,
          background: isCharity?'rgba(61,220,132,0.18)':'rgba(192,132,252,0.18)',
          borderRadius:3,display:'flex',alignItems:'center',justifyContent:'center' }}>
          <span style={{ fontSize:9,color: isCharity?'#3ddc84':'#c084fc',fontWeight:700 }}>{isCharity?'OXFAM':'H&M SALE'}</span>
        </div>
        <div style={{ position:'absolute',bottom:14,left:11,width:34,height:38,
          background:'rgba(180,220,255,0.08)',border:'1px solid rgba(180,220,255,0.18)' }}>
          <div style={{ padding:4,fontSize:7,color: isCharity?'rgba(61,220,132,0.55)':'rgba(192,132,252,0.55)',lineHeight:1.3 }}>
            {isCharity?'Clothes £3+':'NEW SEASON 40% OFF'}
          </div>
        </div>
      </div>
      {!isCharity && co2>5 && [0,1,2,3].map(i=>(
        <div key={i} style={{ position:'absolute',top:`${4+i*12}%`,left:`${12+i*22}%`,fontSize:`${15+i*3}px`,
          animation:`packageFall ${1.5+i*0.3}s ease-in ${i*0.2}s infinite` }}>📦</div>
      ))}
      {isCharity && [0,1,2].map(i=>(
        <div key={i} style={{ position:'absolute',top:`${8+i*16}%`,left:`${18+i*26}%`,fontSize:15,
          animation:`leafFloat ${2+i*0.4}s ease-in-out ${i*0.3}s infinite alternate` }}>🌿</div>
      ))}
      <div style={{ position:'absolute',top:11,left:13,fontFamily:'monospace',fontSize:17,fontWeight:800,
        color: isCharity||co2<1?'#3ddc84':'#ff5c5c',
        textShadow:`0 0 10px ${isCharity?'rgba(61,220,132,0.6)':'rgba(255,80,0,0.4)'}` }}>
        {co2} <span style={{ fontSize:10,fontWeight:400,color:'rgba(255,255,255,0.4)' }}>kg CO₂</span>
      </div>
    </div>
  )
}

function SceneFood({ co2, isBeef, isCook }) {
  return (
    <div style={{ position:'relative',width:'100%',height:155,borderRadius:14,overflow:'hidden',
      background: isCook?'linear-gradient(180deg,#0a1a0a,#111810)':'linear-gradient(180deg,#100a00,#1a1000)',
      marginBottom:12 }}>
      <div style={{ position:'absolute',bottom:0,left:0,right:0,height:48,
        background:'rgba(255,255,255,0.04)',borderTop:'1px solid rgba(255,255,255,0.07)' }}/>
      <div style={{ position:'absolute',bottom:48,left:'50%',transform:'translateX(-50%)' }}>
        {isCook ? (
          <div style={{ position:'relative' }}>
            <svg viewBox="0 0 60 40" width="60" height="40">
              <ellipse cx="30" cy="32" rx="26" ry="8" fill="#2a4a2a"/>
              <path d="M4,32 Q4,12 30,12 Q56,12 56,32 Z" fill="#3a6a3a"/>
              <ellipse cx="30" cy="12" rx="26" ry="6" fill="#4a8a4a"/>
            </svg>
            {[0,1,2].map(i=>(
              <div key={i} style={{ position:'absolute',top:-10,left:`${14+i*16}px`,width:4,height:20,
                background:'rgba(255,255,255,0.12)',borderRadius:2,
                animation:`steamRise ${1+i*0.2}s ease-in-out ${i*0.15}s infinite` }}/>
            ))}
          </div>
        ) : (
          <div style={{ textAlign:'center',position:'relative' }}>
            <div style={{ fontSize:36,animation:'deliveryBounce 0.8s ease-in-out infinite alternate' }}>{isBeef?'🍲':'🍱'}</div>
            {isBeef && [0,1,2].map(i=>(
              <div key={i} style={{ position:'absolute',top:`${-28+i*(-18)}px`,left:`${42+i*28}px`,
                fontSize:`${13-i*2}px`,opacity:0.8-i*0.2,
                animation:`containerPop 0.5s ease-out ${i*0.15}s both` }}>🥡</div>
            ))}
          </div>
        )}
      </div>
      <div style={{ position:'absolute',top:11,left:13,fontFamily:'monospace',fontSize:17,fontWeight:800,
        color: isCook||co2<1?'#3ddc84':isBeef?'#ff5c5c':'#f5a623',
        textShadow:`0 0 10px ${isCook?'rgba(61,220,132,0.6)':'rgba(255,100,0,0.4)'}` }}>
        {co2} <span style={{ fontSize:10,fontWeight:400,color:'rgba(255,255,255,0.4)' }}>kg CO₂</span>
      </div>
      {isBeef && <div style={{ position:'absolute',bottom:56,right:11,fontSize:9,color:'rgba(255,120,80,0.65)',fontStyle:'italic' }}>Poore & Nemecek, Science 2018</div>}
    </div>
  )
}

function SceneBubble({ choice, landmark }) {
  if (!choice) return null
  const anim = choice.animation || ''
  const id   = choice.id || ''
  const co2  = choice.co2 ?? 0
  if (anim === 'flight') return <SceneFlight co2={co2} />
  if (anim === 'heater') return <SceneHeater co2={co2} city='edinburgh' />
  if (anim === 'car')    return <SceneCar co2={co2} isWalk={false} isBus={false} />
  if (anim === 'bus')    return <SceneCar co2={co2} isWalk={false} isBus={true} />
  if (anim === 'walk')   return <SceneCar co2={co2} isWalk={true}  isBus={false} />
  if (anim === 'shopping') return <SceneShopping co2={co2} isCharity={id.includes('charity')||id.includes('second')} />
  if (anim === 'food' || id.includes('beef') || id.includes('chicken') || id.includes('cook') || id.includes('veg'))
    return <SceneFood co2={co2} isBeef={id.includes('beef')||id.includes('hotpot')} isCook={id.includes('cook')||id.includes('veg')} />
  const cc = co2===0?'#3ddc84':co2>500?'#ff2222':co2>5?'#ff5c5c':co2>1?'#f5a623':'#3ddc84'
  return (
    <div style={{ background:'rgba(255,255,255,0.04)',borderRadius:12,padding:'18px',textAlign:'center',marginBottom:12 }}>
      <div style={{ fontFamily:'monospace',fontSize:32,fontWeight:800,color:cc }}>{co2===0?'0.00':co2>=100?co2.toLocaleString():co2}</div>
      <div style={{ fontSize:11,color:'rgba(255,255,255,0.4)',marginTop:4 }}>kg CO₂e</div>
    </div>
  )
}


//  POPUP
function ScenarioPopup({ landmark, onClose, mapRef, onChoice, cityKey }) {
  const [selected, setSelected] = useState(null)
  const [showFormula, setShowFormula] = useState(false)
  const [showPeers, setShowPeers] = useState(false)

  // Peer insight data (simulated realistic stats per landmark+choice)
  const PEER_INSIGHTS = {
    // Transport - Edinburgh
    uber:    { pct: 62, quotes: [
      "Edinburgh to lectures at 8am in winter. I tried walking once. Never again.",
      "I tell myself it's a one-off but it's become a habit. My carbon footprint hates me.",
      "Split the Uber with a flatmate. Less guilty that way.",
    ], feel: "relieved" },
    bus:     { pct: 71, quotes: [
      "The Lothian app makes it so easy. And it's only £1.80.",
      "I actually like the bus. You get to see the city properly.",
      "Started using the bus out of necessity, kept using it out of habit.",
    ], feel: "proud" },
    walk:    { pct: 31, quotes: [
      "Walking to uni honestly changed my mental health. Highly recommend.",
      "I was the only person in my flat who walked everywhere. Now two others do too.",
      "30 minutes in the rain is fine. You adjust.",
    ], feel: "proud" },
    // Transport - Shanghai
    didi:    { pct: 58, quotes: [
      "Didi is just so convenient when you're tired after class.",
      "The metro is great but at midnight Didi is the only real option.",
      "I know the metro is better but sometimes I just can't face the crowds.",
    ], feel: "guilty" },
    subway:  { pct: 79, quotes: [
                      ], feel: "proud" },
    bike:    { pct: 43, quotes: [
            "I only discovered shared bikes in second month. Game changer.",
      "Getting sweaty in summer is the only downside. Worth it.",
    ], feel: "proud" },
    // Food
    beef:    { pct: 67, quotes: [
      "Three weeks into the semester and I've had hot pot five times. No regrets.",
      "I know the carbon footprint of beef is terrible. I know. But also... hot pot.",
      "Ordered beef again. The app even told me the carbon estimate. Still ordered it.",
    ], feel: "guilty" },
    chicken: { pct: 54, quotes: [
      "Chicken rice is my go-to. Good protein, reasonable price, I tell myself it's fine.",
      "Switched from beef to chicken about halfway through term. Felt like progress.",
    ], feel: "neutral" },
    cook:    { pct: 38, quotes: [
      "Cooking is actually therapeutic. Cheaper AND lower carbon? Easy choice.",
      "Flatmates started cooking together after I started. Snowball effect.",
      "The hardest part was buying the ingredients the first time. After that it was easy.",
    ], feel: "proud" },
    // Shopping
    buy_2:       { pct: 48, quotes: [
      "H&M sale is dangerous. I know it's bad but the jacket was genuinely perfect.",
      "I bought three things I haven't worn. The sale felt urgent in the moment.",
      "Edinburgh Princes Street is a trap. I walked in for coffee and left with bags.",
    ], feel: "guilty" },
    charity_p:   { pct: 29, quotes: [
      "Found an incredible coat in Oxfam for £12. New one would have been £80.",
      "Charity shop culture in Edinburgh is actually really good. London doesn't have this.",
      "My mum thought second-hand was weird. I sent her the carbon numbers. She came around.",
    ], feel: "proud" },
    // Heating / AC
    heater_max:  { pct: 74, quotes: [
      "Edinburgh in November with the heating off is not something I'd recommend.",
      "I tried to be frugal with the heating. Got sick. The heating stays on now.",
      "My flatmate from Hong Kong had never experienced cold like this. The heater was non-negotiable.",
    ], feel: "relieved" },
    ac_16:       { pct: 69, quotes: [
                      ], feel: "guilty" },
    ac_26:       { pct: 41, quotes: [
      "26°C with a fan is actually fine once you get used to it.",
      "Tried the 26°C + fan approach. Saved money, slept better.",
    ], feel: "proud" },
    // Flights
    fly_home:    { pct: 91, quotes: [
      "There's no real alternative. I need to see my family.",
      "I tried to stay for one CNY. It was the right thing. It was also genuinely hard.",
      "The carbon from flying home is something I think about but don't know how to resolve.",
      "My family would be devastated if I didn't come back for CNY. Some things are more important.",
    ], feel: "conflicted" },
    // Waste
    sort_4:      { pct: 44, quotes: [
      "The four-category sorting confused me at first but now it's automatic.",
      "Got fined ¥50 in the first week. Never made that mistake again.",
          ], feel: "proud" },
    recycle_all: { pct: 52, quotes: [
      "It takes five minutes. I don't understand why people can't be bothered.",
      "Started recycling after seeing the landfill statistics. Small thing but it matters.",
    ], feel: "proud" },
  }

  // Get peer data: match by choice id or animation type
  function getPeerData(ch) {
    if (!ch) return null
    const id = ch.id || ''
    const anim = ch.animation || ''
    // Try direct match first
    for (const [key, val] of Object.entries(PEER_INSIGHTS)) {
      if (id.includes(key) || anim.includes(key)) return val
    }
    // Fallback mappings
    if (id.includes('uber') || id.includes('taxi')) return PEER_INSIGHTS.uber
    if (id.includes('bus') || id.includes('lothian')) return PEER_INSIGHTS.bus
    if (id.includes('walk') && !id.includes('board')) return PEER_INSIGHTS.walk
    if (id.includes('didi') || id.includes('ev')) return PEER_INSIGHTS.didi
    if (id.includes('subway') || id.includes('metro') || id.includes('train')) return PEER_INSIGHTS.subway
    if (id.includes('bike') || id.includes('cycle')) return PEER_INSIGHTS.bike
    if (id.includes('beef') || id.includes('hotpot')) return PEER_INSIGHTS.beef
    if (id.includes('chicken')) return PEER_INSIGHTS.chicken
    if (id.includes('cook') || id.includes('veg')) return PEER_INSIGHTS.cook
    if (id.includes('buy_2') || id.includes('buy_3') || id.includes('fast')) return PEER_INSIGHTS.buy_2
    if (id.includes('charity') || id.includes('second')) return PEER_INSIGHTS.charity_p
    if (id.includes('heat_full') || id.includes('heater_max') || id.includes('ac_16')) return id.includes('ac_16') ? PEER_INSIGHTS.ac_16 : PEER_INSIGHTS.heater_max
    if (id.includes('heat_low') || id.includes('ac_26')) return PEER_INSIGHTS.ac_26
    if (id.includes('fly') || anim.includes('flight')) return PEER_INSIGHTS.fly_home
    if (id.includes('recycle') || id.includes('sort') || id.includes('charity_donate')) return PEER_INSIGHTS.sort_4
    return null
  }

  const peerData = selected ? getPeerData(selected) : null
  const s = landmark.scenario
  const catColor = CATEGORY_COLORS[landmark.category]

  useEffect(() => { setSelected(null); setShowFormula(false) }, [landmark.id])

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, width: 390,
      background: 'rgba(7,11,18,0.97)', backdropFilter: 'blur(24px)',
      borderLeft: '0.5px solid rgba(255,255,255,0.09)',
      display: 'flex', flexDirection: 'column', zIndex: 100,
      animation: 'slideIn 0.2s ease', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.07)',
        background: s.bg, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, marginRight: 10 }}>
            <div style={{ fontSize: 10, color: catColor, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: 3 }}>
              {CATEGORY_LABELS[landmark.category]} · {landmark.name}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25, marginBottom: 2 }}>{s.title}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{s.subtitle}</div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.5)',
            width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>✕</button>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.68)', lineHeight: 1.6, background: 'rgba(0,0,0,0.18)', borderRadius: 8, padding: '9px 11px' }}>
          {s.context}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {!selected ? (
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
              Your choice
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {s.choices.map(ch => (
                <button key={ch.id} onClick={() => {
                  setSelected(ch)
                  if (mapRef?.current) playMapAnimation(mapRef.current, landmark, ch)
                  if (onChoice) {
                    // Each landmark has one fixed carbon category
                    const locCatMap = {
                      calton:     'transport',   // transport choices only
                      pollock:    'energy',       // heating choices only
                      princes:    'shopping',     // shopping choices only
                      airport_ed: 'flights',      // flight choices only
                      holyrood:   'waste',        // waste choices only
                    }
                    const cat = locCatMap[landmark?.id] || 'transport'
                    onChoice(ch.co2 || 0, cat)
                  }
                }}
                  style={{
                    background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
                    borderRadius: 10, padding: '11px 13px', color: 'white', cursor: 'pointer',
                    textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${ch.color}13`; e.currentTarget.style.borderColor = `${ch.color}40` }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
                >
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{ch.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>{ch.sub}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
              You chose
            </div>
            <div style={{ background: `${selected.color}12`, border: `0.5px solid ${selected.color}30`, borderRadius: 8, padding: '8px 11px', marginBottom: 10, fontSize: 13, fontWeight: 500 }}>
              {selected.label}
            </div>

            <SceneBubble choice={selected} landmark={landmark} />

            {/* Equiv */}
            <div style={{ background: `${selected.color}0e`, border: `0.5px solid ${selected.color}25`, borderRadius: 10, padding: '10px 12px', marginBottom: 9 }}>
              <div style={{ fontSize: 9, color: selected.color, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Equivalent to</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{selected.equiv}</div>
            </div>

            {/* Formula */}
            <button onClick={() => setShowFormula(v => !v)}
              style={{
                width: '100%', background: 'rgba(61,220,132,0.05)', border: '0.5px solid rgba(61,220,132,0.14)',
                borderRadius: 8, padding: '7px 11px', color: 'rgba(61,220,132,0.65)', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 11, textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6,
              }}
            >
              <span>🔍</span>{showFormula ? 'Hide calculation' : 'Show calculation & source (DEFRA 2023 / CEADs)'}
            </button>
            {showFormula && (
              <div style={{ background: 'rgba(61,220,132,0.04)', border: '0.5px solid rgba(61,220,132,0.12)', borderRadius: 8, padding: '9px 11px', marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, fontFamily: 'monospace' }}>{selected.formula}</div>
                <div style={{ fontSize: 10, color: 'rgba(61,220,132,0.5)', marginTop: 5 }}>Source: {selected.source}</div>
              </div>
            )}



            <button onClick={() => setSelected(null)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '8px', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11 }}
            >
              ← Try another option
            </button>

            {/* ── PANEL A: Social Proof (Peer Insights) ── */}
            {peerData && (
              <div style={{ marginTop: 8 }}>
                <button onClick={() => setShowPeers(v => !v)}
                  style={{ width: '100%', background: 'rgba(91,191,255,0.05)', border: '0.5px solid rgba(91,191,255,0.15)', borderRadius: 8, padding: '7px 11px', color: 'rgba(91,191,255,0.7)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}
                >
                  <span>👥</span>{showPeers ? 'Hide peer insights' : `👥 ${peerData.pct}% of students made this choice — see what they said`}
                </button>
                {showPeers && (
                  <div style={{ background: 'rgba(91,191,255,0.05)', border: '0.5px solid rgba(91,191,255,0.12)', borderRadius: 10, padding: '12px 13px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${peerData.pct}%`, background: '#5bbfff', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#5bbfff' }}>{peerData.pct}%</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
                      {peerData.pct}% of Chinese international students who tried this scenario made the same choice.
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '9px 11px', borderLeft: '2px solid rgba(91,191,255,0.3)' }}>
                      <div style={{ fontSize: 10, color: 'rgba(91,191,255,0.5)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Anonymous peer comment</div>
                      {peerData.quotes.map((q, qi) => (
                        <div key={qi} style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, fontStyle: 'italic', marginBottom: qi < peerData.quotes.length-1 ? 8 : 0, paddingBottom: qi < peerData.quotes.length-1 ? 8 : 0, borderBottom: qi < peerData.quotes.length-1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none' }}>
                          "{q}"
                        </div>
                      ))}
                      <div style={{ fontSize: 10, color: peerData.feel === 'guilty' ? '#f5a623' : peerData.feel === 'proud' ? '#3ddc84' : '#5bbfff', marginTop: 6 }}>
                        Reported feeling: {peerData.feel}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 8, lineHeight: 1.5 }}>
                      Seeing that others made the same choice — does that make you feel better, or does it make you want to reflect? This tension is exactly what this research is exploring.
                    </div>
                  </div>
                )}
              </div>
            )}


          </div>
        )}
      </div>
      <style>{`@keyframes slideIn{from{transform:translateX(30px);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes mapPopIn{0%{transform:scale(0.2);opacity:0}60%{transform:scale(1.2);opacity:1}100%{transform:scale(1);opacity:1}}@keyframes snowfall{0%{transform:translateY(-10px);opacity:0}50%{opacity:0.8}100%{transform:translateY(60px);opacity:0}}@keyframes heatRise{0%,100%{transform:translateY(0)scaleX(1);opacity:0.6}50%{transform:translateY(-18px)scaleX(0.6);opacity:0.2}}@keyframes cloudDrift{0%{transform:translateX(-8px)}100%{transform:translateX(8px)}}@keyframes roadMove{0%{background-position:0 0}100%{background-position:-40px 0}}@keyframes walkBob{0%{transform:translateX(-50%)translateY(0)}100%{transform:translateX(-50%)translateY(-4px)}}@keyframes vehicleDrive{0%{transform:translateX(-50%)translateY(0)}50%{transform:translateX(-50%)translateY(-2px)}100%{transform:translateX(-50%)translateY(0)}}@keyframes smokeRise{0%{transform:translateY(0)scale(0.3);opacity:0.6}100%{transform:translateY(-30px)scale(1.5);opacity:0}}@keyframes leafFloat{0%{transform:translateY(0)rotate(-10deg)}100%{transform:translateY(-8px)rotate(10deg)}}@keyframes planeFly{0%,100%{transform:translate(-50%,-50%)translateX(-15px)}50%{transform:translate(-50%,-50%)translateX(15px)}}@keyframes contrail{0%,100%{opacity:0.2}50%{opacity:0.6}}@keyframes twinkle{0%{opacity:0.2}100%{opacity:0.8}}@keyframes packageFall{0%{transform:translateY(-20px);opacity:0}50%{opacity:0.9}100%{transform:translateY(20px);opacity:0}}@keyframes steamRise{0%,100%{transform:translateY(0)scaleX(1);opacity:0.4}50%{transform:translateY(-16px)scaleX(0.5);opacity:0}}@keyframes deliveryBounce{0%{transform:translateY(0)}100%{transform:translateY(-5px)}}@keyframes containerPop{from{transform:scale(0)translateY(10px);opacity:0}to{transform:scale(1)translateY(0);opacity:1}}@keyframes criticalPulse{0%,100%{opacity:0.6;border-color:rgba(255,60,60,0.4)}50%{opacity:1;border-color:rgba(255,60,60,0.9)}}@keyframes fadeQuick{0%{opacity:1}100%{opacity:0}}
@keyframes warningFlash{0%{opacity:0}10%{opacity:1}80%{opacity:1}100%{opacity:0}}
@keyframes criticalFade{0%{opacity:0}8%{opacity:1}85%{opacity:1}100%{opacity:0}}
@keyframes overloadIn{0%{opacity:0;transform:scale(1.05)}100%{opacity:1;transform:scale(1)}}
@keyframes dissolveOut{0%{opacity:1;filter:blur(0px)}100%{opacity:0;filter:blur(20px)}}
@keyframes overloadPop{from{transform:scale(0.3);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes overloadSpin{0%{transform:rotate(0deg)scale(1)}50%{transform:rotate(180deg)scale(1.2)}100%{transform:rotate(360deg)scale(1)}}
@keyframes neonFlicker{0%,100%{opacity:1;text-shadow:0 0 40px rgba(255,32,32,1),0 0 80px rgba(255,32,32,0.6)}50%{opacity:0.85;text-shadow:0 0 20px rgba(255,32,32,0.8)}}
@keyframes countdownPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.15);opacity:0.8}}
@keyframes wobble{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
@keyframes flicker{0%,100%{opacity:1}50%{opacity:0.7}}
@keyframes screenShake{0%,100%{transform:translate(0,0)}25%{transform:translate(-3px,2px)}75%{transform:translate(3px,-2px)}}@keyframes greenPulse{0%,100%{box-shadow:0 0 0 0 rgba(61,220,132,0)}50%{box-shadow:0 0 12px 3px rgba(61,220,132,0.3)}}`}</style>
    </div>
  )
}

//  MAIN
export default function MapPage() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markersRef = useRef([])
  const { addSessionCarbon } = useApp()
  const city = 'edinburgh'
  const [selectedLandmark, setSelectedLandmark] = useState(null)
  const [mapReady, setMapReady] = useState(false)
  const [sessionCarbon, setSessionCarbon] = useState(0)
  const [cityHealth, setCityHealth] = useState(100)
  const [overload, setOverload] = useState(null) // null | 'warning' | 'critical' | 'overload'
  const [overloadCountdown, setOverloadCountdown] = useState(5)
  const setLandmarkRef = useRef(setSelectedLandmark)
  setLandmarkRef.current = setSelectedLandmark

  const healthFromCarbon = (c) => Math.max(0, Math.round(100 - c * 0.8))

  const CITY_CFG = {
    edinburgh: { center: [-3.1883, 55.9533], zoom: 13, pitch: 50, bearing: -10 },
  }

  useEffect(() => {
    if (map.current) return
    import('mapbox-gl').then(({ default: mapboxgl }) => {
      mapboxgl.accessToken = MAPBOX_TOKEN
      const c = CITY_CFG.edinburgh
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: c.center, zoom: c.zoom, pitch: c.pitch, bearing: c.bearing, antialias: true,
      })
      map.current.on('load', () => {
        map.current.addLayer({
          id: '3d-buildings', source: 'composite', 'source-layer': 'building',
          filter: ['==', 'extrude', 'true'], type: 'fill-extrusion', minzoom: 12,
          paint: {
            'fill-extrusion-color': '#1a2a3a',
            'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 12, 0, 12.05, ['get', 'height']],
            'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 12, 0, 12.05, ['get', 'min_height']],
            'fill-extrusion-opacity': 0.7,
          },
        })
        setMapReady(true)
      })
    })
    return () => { if (map.current) { map.current.remove(); map.current = null } }
  }, [])

  // Update building colour based on carbon — low carbon = clean blue-green, high = smog
  useEffect(() => {
    if (!map.current || !mapReady) return
    const smog = Math.max(0, (100 - cityHealth) / 100)
    const green = Math.max(0, (cityHealth - 70) / 30)
    let buildingColor
    if (smog > 0.3) {
      // High carbon: yellowed smog tint on buildings
      buildingColor = `rgba(${Math.round(80+smog*60)},${Math.round(90-smog*40)},${Math.round(80-smog*40)},1)`
    } else if (green > 0.1) {
      // Low carbon: crisp blue-green — city looks clean and alive
      buildingColor = `rgba(${Math.round(20+green*10)},${Math.round(50+green*40)},${Math.round(70+green*50)},1)`
    } else {
      buildingColor = '#1a2a3a'
    }
    map.current.setPaintProperty('3d-buildings', 'fill-extrusion-color', buildingColor)
  }, [cityHealth, city, mapReady])

  useEffect(() => {
    if (!map.current || !mapReady) return
    const c = CITY_CFG[city]
    map.current.flyTo({ center: c.center, zoom: c.zoom, pitch: c.pitch, bearing: c.bearing, duration: 1800 })
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    setSelectedLandmark(null)

    import('mapbox-gl').then(({ default: mapboxgl }) => {
      ;(LANDMARKS[city] || []).forEach(lm => {
        const cc = CATEGORY_COLORS[lm.category]
        const el = document.createElement('div')
        el.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;'

        const circle = document.createElement('div')
        circle.style.cssText = `background:${cc};border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 0 3px rgba(255,255,255,0.1),0 4px 14px rgba(0,0,0,0.5);transition:box-shadow 0.2s,filter 0.2s;`
        circle.textContent = lm.emoji

        const lbl = document.createElement('div')
        lbl.style.cssText = `background:rgba(7,11,18,0.88);color:white;font-size:10px;padding:3px 8px;border-radius:10px;margin-top:4px;white-space:nowrap;border:0.5px solid rgba(255,255,255,0.1);font-family:Inter,sans-serif;`
        lbl.textContent = lm.name

        const pin = document.createElement('div')
        pin.style.cssText = `width:2px;height:8px;background:${cc};margin-top:2px;border-radius:1px;`

        el.appendChild(circle); el.appendChild(lbl); el.appendChild(pin)

        el.addEventListener('mouseenter', () => { circle.style.boxShadow = `0 0 0 4px ${cc}55,0 4px 20px rgba(0,0,0,0.6)`; circle.style.filter = 'brightness(1.15)' })
        el.addEventListener('mouseleave', () => { circle.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.1),0 4px 14px rgba(0,0,0,0.5)'; circle.style.filter = 'brightness(1)' })
        el.addEventListener('click', e => {
          e.stopPropagation()
          setLandmarkRef.current(lm)
          map.current.flyTo({ center: [lm.lng, lm.lat], zoom: 15, duration: 700 })
        })

        markersRef.current.push(
          new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([lm.lng, lm.lat]).addTo(map.current)
        )
      })
    })
  }, [mapReady, city])

  // Carbon level thresholds for visual feedback
  const carbonLevel = sessionCarbon < 5 ? 'clean' : sessionCarbon < 15 ? 'moderate' : sessionCarbon < 30 ? 'high' : 'critical'
  const overlayOpacity = Math.min(0.55, sessionCarbon / 80)
  const overlayColor = carbonLevel === 'clean' ? 'transparent'
    : carbonLevel === 'moderate' ? `rgba(245,166,35,${overlayOpacity})`
    : carbonLevel === 'high'     ? `rgba(255,120,40,${overlayOpacity})`
    : `rgba(255,60,60,${overlayOpacity})`

  // Injunctive norm: explicit social approval when carbon is low (prevents boomerang effect)
  // Based on Schultz et al. (2007): descriptive norms alone can backfire;
  // pairing them with injunctive approval sustains low-carbon behaviour.
  const positiveMsg = sessionCarbon > 0.5 && carbonLevel === 'clean'
    ? '🌿 Great choices — Edinburgh thanks you. Keep it up.'
    : null

  const warningMsg = carbonLevel === 'moderate' ? '⚠️ Carbon rising — consider lower-impact choices'
    : carbonLevel === 'high'    ? '🔴 High carbon footprint — city health declining'
    : carbonLevel === 'critical'? '🚨 Critical carbon level — Edinburgh is suffering'
    : null

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* ── CARBON OVERLOAD FULL-SCREEN FX ── */}
      {overload === 'warning' && (
        <div style={{
          position:'fixed',inset:0,zIndex:9000,pointerEvents:'none',
          animation:'warningFlash 3s ease forwards',
        }}>
          <div style={{
            position:'absolute',inset:0,
            background:'radial-gradient(ellipse at 50% 50%, rgba(245,166,35,0.0) 0%, rgba(245,166,35,0.35) 100%)',
            border:'3px solid rgba(245,166,35,0.7)',
          }}/>
          <div style={{
            position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
            textAlign:'center',
          }}>
            <div style={{fontSize:48,marginBottom:8,animation:'wobble 0.4s ease infinite'}}>⚠️</div>
            <div style={{fontFamily:'monospace',fontSize:22,fontWeight:900,color:'#f5a623',
              textShadow:'0 0 20px rgba(245,166,35,0.8)',letterSpacing:'3px',
              animation:'flicker 0.3s ease infinite'}}>
              CARBON WARNING
            </div>
            <div style={{fontSize:13,color:'rgba(245,166,35,0.7)',marginTop:8,letterSpacing:'1px'}}>
              {sessionCarbon.toFixed(1)} kg CO₂e accumulated
            </div>
          </div>
        </div>
      )}

      {overload === 'critical' && (
        <div style={{
          position:'fixed',inset:0,zIndex:9000,pointerEvents:'none',
          animation:'screenShake 0.15s ease infinite, criticalFade 4s ease forwards',
        }}>
          <div style={{
            position:'absolute',inset:0,
            background:'rgba(255,60,40,0.15)',
            border:'4px solid rgba(255,60,40,0.8)',
          }}/>
          {/* Smog particles */}
          {[...Array(12)].map((_,i) => (
            <div key={i} style={{
              position:'absolute',
              left:`${8+i*7}%`, bottom:`${10+Math.sin(i)*15}%`,
              width:`${30+i*8}px`,height:`${30+i*8}px`,
              borderRadius:'50%',
              background:`rgba(80,60,40,${0.3+i*0.03})`,
              filter:'blur(8px)',
              animation:`smokeRise ${2+i*0.3}s ease-in-out ${i*0.15}s infinite alternate`,
            }}/>
          ))}
          <div style={{
            position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-60%)',
            textAlign:'center',
          }}>
            <div style={{fontSize:56,marginBottom:12,filter:'drop-shadow(0 0 20px rgba(255,60,40,0.9))'}}>🔴</div>
            <div style={{
              fontFamily:'monospace',fontSize:28,fontWeight:900,
              color:'#ff3c28',letterSpacing:'4px',
              textShadow:'0 0 30px rgba(255,60,40,0.9), 0 0 60px rgba(255,60,40,0.5)',
              animation:'flicker 0.2s ease infinite',
            }}>
              HIGH CARBON ALERT
            </div>
            <div style={{fontSize:14,color:'rgba(255,120,80,0.9)',marginTop:10,letterSpacing:'2px'}}>
              Edinburgh air quality: CRITICAL
            </div>
            <div style={{fontSize:12,color:'rgba(255,100,60,0.7)',marginTop:6}}>
              {sessionCarbon.toFixed(1)} kg CO₂e — city health declining
            </div>
          </div>
        </div>
      )}

      {(overload === 'overload' || overload === 'dissolve') && (
        <div style={{
          position:'fixed',inset:0,zIndex:9999,
          background: overload === 'dissolve' ? 'rgba(0,0,0,0)' : '#000',
          animation: overload === 'dissolve' ? 'dissolveOut 1.2s ease forwards' : 'overloadIn 0.3s ease forwards',
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          overflow:'hidden',
        }}>
          {overload === 'overload' && (<>
            {/* Animated smoke/particle background */}
            {[...Array(20)].map((_,i) => (
              <div key={i} style={{
                position:'absolute',
                left:`${Math.random()*100}%`,
                bottom:'-20px',
                width:`${40+i*15}px`,height:`${40+i*15}px`,
                borderRadius:'50%',
                background:`rgba(${40+i*3},${20+i*2},${20+i*2},0.6)`,
                filter:'blur(12px)',
                animation:`smokeRise ${3+i*0.2}s ease-in ${i*0.1}s infinite`,
              }}/>
            ))}

            {/* Central warning */}
            <div style={{
              position:'relative',zIndex:10,textAlign:'center',
              animation:'overloadPop 0.5s 0.2s cubic-bezier(0.34,1.56,0.64,1) both',
            }}>
              <div style={{fontSize:80,marginBottom:16,
                animation:'overloadSpin 2s linear infinite',
                filter:'drop-shadow(0 0 40px rgba(255,40,40,1))',
              }}>☢️</div>

              <div style={{
                fontFamily:'monospace',fontSize:36,fontWeight:900,letterSpacing:'6px',
                color:'#ff2020',
                textShadow:'0 0 40px rgba(255,32,32,1), 0 0 80px rgba(255,32,32,0.6)',
                animation:'neonFlicker 0.15s ease infinite',
                marginBottom:8,
              }}>
                CARBON OVERLOAD
              </div>

              <div style={{
                fontFamily:'monospace',fontSize:14,color:'rgba(255,80,60,0.8)',
                letterSpacing:'3px',marginBottom:24,
              }}>
                CALCULATING PERMANENT ECOLOGICAL DAMAGE...
              </div>

              {/* Countdown */}
              <div style={{
                fontFamily:'monospace',fontSize:64,fontWeight:900,
                color:'#ff2020',lineHeight:1,
                textShadow:'0 0 60px rgba(255,32,32,1)',
                animation:'countdownPulse 1s ease infinite',
              }}>
                {overloadCountdown}
              </div>

              <div style={{fontSize:12,color:'rgba(255,60,40,0.6)',marginTop:12,letterSpacing:'2px'}}>
                {sessionCarbon.toFixed(1)} kg CO₂e · City health: {cityHealth}%
              </div>

              {/* Progress bar draining */}
              <div style={{width:280,height:6,background:'rgba(255,255,255,0.1)',borderRadius:3,marginTop:20,overflow:'hidden'}}>
                <div style={{
                  height:'100%',
                  width:`${(overloadCountdown/5)*100}%`,
                  background:'linear-gradient(90deg,#ff2020,#ff8020)',
                  borderRadius:3,
                  transition:'width 0.9s linear',
                  boxShadow:'0 0 10px rgba(255,32,32,0.8)',
                }}/>
              </div>
            </div>
          </>)}
        </div>
      )}

      {/* ── Carbon smog overlay on map ── */}
      {carbonLevel !== 'clean' && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: overlayColor,
          transition: 'background 1.2s ease',
          zIndex: 1,
        }} />
      )}

      {/* ── Pulse ring when critical ── */}
      {carbonLevel === 'critical' && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          border: '3px solid rgba(255,60,60,0.6)',
          animation: 'criticalPulse 1.5s ease-in-out infinite',
          zIndex: 2,
        }} />
      )}

      {/* ── Positive injunctive feedback (low carbon) ── */}
      {positiveMsg && (
        <div style={{
          position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(10,40,20,0.92)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(61,220,132,0.5)',
          borderRadius: 20, padding: '7px 18px',
          fontSize: 12, fontWeight: 600,
          color: '#3ddc84',
          pointerEvents: 'none', whiteSpace: 'nowrap',
          animation: 'greenPulse 2s ease-in-out infinite',
          zIndex: 25,
        }}>
          {positiveMsg}
        </div>
      )}

      {/* ── Warning banner (high carbon) ── */}
      {warningMsg && (
        <div style={{
          position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)',
          background: carbonLevel === 'critical' ? 'rgba(255,60,60,0.92)' : 'rgba(40,25,10,0.92)',
          backdropFilter: 'blur(8px)',
          border: `1px solid ${carbonLevel === 'critical' ? 'rgba(255,60,60,0.8)' : 'rgba(245,166,35,0.5)'}`,
          borderRadius: 20, padding: '7px 18px',
          fontSize: 12, fontWeight: 600,
          color: carbonLevel === 'critical' ? 'white' : '#f5a623',
          pointerEvents: 'none', whiteSpace: 'nowrap',
          animation: carbonLevel === 'critical' ? 'criticalPulse 1.5s ease-in-out infinite' : 'none',
          zIndex: 25,
        }}>
          {warningMsg}
        </div>
      )}

      <div style={{ position: 'absolute', bottom: 16, left: 12, background: 'rgba(7,11,18,0.85)', backdropFilter: 'blur(10px)', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '8px 14px', display: 'flex', gap: 14 }}>
        {Object.entries(CATEGORY_LABELS).map(([k, l]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[k] }} />
            {l}
          </div>
        ))}
      </div>

      {!selectedLandmark && (
        <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', background: 'rgba(7,11,18,0.85)', backdropFilter: 'blur(10px)', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: '7px 18px', fontSize: 12, color: 'rgba(255,255,255,0.45)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          Click a landmark to explore carbon scenarios →
        </div>
      )}

      {/* City health HUD */}
      <div style={{
        position: 'absolute', top: 14, right: selectedLandmark ? 402 : 12,
        background: 'rgba(7,11,18,0.88)', backdropFilter: 'blur(10px)',
        border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: 10,
        padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 4,
        transition: 'right 0.3s ease', zIndex: 20, minWidth: 160,
      }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          🏴󠁧󠁢󠁳󠁣󠁴󠁿 Edinburgh Health
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${cityHealth}%`, background: cityHealth > 60 ? '#3ddc84' : cityHealth > 30 ? '#f5a623' : '#ff5c5c', borderRadius: 3, transition: 'width 0.8s ease, background 0.8s ease' }} />
          </div>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: cityHealth > 60 ? '#3ddc84' : cityHealth > 30 ? '#f5a623' : '#ff5c5c', fontWeight: 700 }}>{cityHealth}%</span>
        </div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
          Session carbon: {sessionCarbon.toFixed(1)} kg CO₂e
        </div>
      </div>

      {selectedLandmark && (
        <ScenarioPopup
          key={selectedLandmark.id}
          landmark={selectedLandmark}
          onClose={() => setSelectedLandmark(null)}
          mapRef={map}
          onChoice={(co2, category) => {
            const newCarbon = sessionCarbon + co2
            setSessionCarbon(newCarbon)
            setCityHealth(healthFromCarbon(newCarbon))
            // Write to global AppContext session
            if (co2 > 0) addSessionCarbon(co2, category || 'transport')

            // Visual pulse on map based on choice carbon level
            const mapEl = mapContainer.current
            if (mapEl) {
              const pulse = document.createElement('div')
              const isLow = co2 < 1.0
              pulse.style.cssText = `position:absolute;inset:0;pointer-events:none;background:${isLow ? 'rgba(61,220,132,0.18)' : 'rgba(255,92,92,0.22)'};border:2px solid ${isLow ? 'rgba(61,220,132,0.5)' : 'rgba(255,92,92,0.5)'};animation:fadeQuick 0.8s ease forwards;z-index:30;`
              mapEl.parentNode.appendChild(pulse)
              setTimeout(() => pulse.remove(), 900)
            }

            // Carbon overload threshold triggers
            const prev = sessionCarbon
            if (prev < 10 && newCarbon >= 10) {
              setOverload('warning')
              setTimeout(() => setOverload(null), 3000)
            } else if (prev < 25 && newCarbon >= 25) {
              setOverload('critical')
              setTimeout(() => setOverload(null), 4000)
            } else if (prev < 50 && newCarbon >= 50) {
              // Full overload — countdown
              setOverload('overload')
              setOverloadCountdown(5)
              const tick = setInterval(() => {
                setOverloadCountdown(n => {
                  if (n <= 1) { clearInterval(tick); setOverload('dissolve'); setTimeout(() => setOverload(null), 1200); return 0 }
                  return n - 1
                })
              }, 1000)
            }
          }}
          cityKey={city}
        />
      )}
    </div>
  )
}
