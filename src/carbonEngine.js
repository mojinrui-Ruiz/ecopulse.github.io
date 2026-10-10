// EcoPulse Carbon Engine
// All emission factors verified from primary sources — see TransparencyPage for full citations

// ── VERIFIED EMISSION FACTORS ────────────────────────────────────
export const EMISSION_FACTORS = {
  edinburgh: {
    // DEFRA 2023, UK electricity sheet — UK electricity generated, 2023
    gridElectricity: 0.207074,
    // DEFRA 2023, Fuels sheet — Natural gas, kWh Net CV
    naturalGas: 0.20226,
    // DEFRA 2023, Fuels sheet — Burning oil, kWh Net CV
    heatingOil: 0.25849,
    // DEFRA 2023, Passenger vehicles sheet — Average car
    petrolCar:  0.16983,
    dieselCar:  0.16391,
    // DEFRA 2023, UK electricity for EVs sheet — Average car Battery EV
    electricCar: 0.04519,
    publicTransport: {
      // DEFRA 2023, SECR kWh pass & delivery vehs sheet
      bus:    0.089,
      train:  0.035,
      tram:   0.029,
      subway: 0.028,
    },
    flights: {
      // DEFRA 2023, Business travel-air sheet — With RF
      // Short-haul to/from UK, Economy class
      shortHaul: 0.18287,
      // Long-haul to/from UK, Economy class, With RF
      // Edinburgh–Shanghai departs FROM UK → use Long-haul to/from UK
      longHaul: 0.20011,
    },
    city: 'Edinburgh',
    country: 'Scotland, UK',
    coords: { lng: -3.1883, lat: 55.9533, zoom: 13 },
    gridLabel: 'UK Grid (0.207 kg/kWh)',
    gridNote: "Scotland's grid is ~70% renewable. UK national average used (DEFRA 2023). Scotland's actual grid is cleaner.",
  },
}


// ── LIFESTYLE PROFILES ───────────────────────────────────────────
// Food: based on Poore & Nemecek (2018)
// Global averages across 38,700 farms, 119 countries
export const DIET_PROFILES = {
  vegan:       { label:'Vegan',       weekly:2.8,  description:'No animal products' },
  vegetarian:  { label:'Vegetarian',  weekly:4.2,  description:'Dairy & eggs included' },
  pescatarian: { label:'Pescatarian', weekly:5.8,  description:'Fish included' },
  mixed:       { label:'Mixed',       weekly:7.4,  description:'Avg. meat consumption' },
  highMeat:    { label:'High-meat',   weekly:14.0, description:'Daily red meat' },
}

// Shopping: DEFRA 2023, Material use sheet
// New clothing: 22,310 kg CO₂e/tonne = 8.92 kg/garment (0.4 kg avg weight)
export const SHOPPING_PROFILES = {
  minimal:  { label:'Minimal',  weekly:1.2,  description:'Second-hand, very little new' },
  moderate: { label:'Moderate', weekly:4.5,  description:'Average consumer' },
  frequent: { label:'Frequent', weekly:9.2,  description:'Regular online shopping' },
  heavy:    { label:'Heavy',    weekly:18.0, description:'High consumption lifestyle' },
}

// Waste: DEFRA 2023, Waste disposal sheet
// Food waste landfill: 700.210 kg CO₂e/tonne; Composting: 8.912 kg CO₂e/tonne
export const WASTE_PROFILES = {
  excellent: { label:'Excellent', weekly:0.3, description:'Composts, recycles >90%' },
  good:      { label:'Good',      weekly:0.8, description:'Recycles most waste' },
  average:   { label:'Average',   weekly:1.6, description:'Some recycling' },
  poor:      { label:'Poor',      weekly:3.2, description:'Minimal recycling' },
}

// ── CARBON CALCULATION ───────────────────────────────────────────
export function calculateCarbon(inputs, city = 'edinburgh') {
  const f = EMISSION_FACTORS['edinburgh']  // Single city: Edinburgh only
  const {
    electricity, gas, heatingOil,
    carKm, carType,
    busKm, trainKm, tramKm, subwayKm,
    shortFlightsPerYear, longFlightsPerYear,
    diet, shopping, waste,
    numPeople,
  } = inputs

  const people = numPeople || 1

  // Energy (weekly) — electricity × 7 days ÷ people
  const energyCO2 = (
    electricity * f.gridElectricity +
    gas         * f.naturalGas +
    heatingOil  * f.heatingOil
  ) * 7 / people

  // Transport (weekly)
  const carFactor = carType === 'electric' ? f.electricCar
    : carType === 'diesel' ? f.dieselCar : f.petrolCar
  const transportCO2 =
    carKm    * carFactor +
    busKm    * f.publicTransport.bus +
    trainKm  * f.publicTransport.train +
    tramKm   * f.publicTransport.tram +
    subwayKm * f.publicTransport.subway

  // Flights (amortised weekly)
  // longHaul uses 0.20011 kg/km (DEFRA 2023, Long-haul to/from UK, Economy, With RF)
  const flightCO2 = (
    shortFlightsPerYear * 800  * f.flights.shortHaul +
    longFlightsPerYear  * 9000 * f.flights.longHaul
  ) / 52 / people

  // Lifestyle profiles (weekly)
  const dietCO2     = DIET_PROFILES[diet]?.weekly     ?? 7.4
  const shoppingCO2 = SHOPPING_PROFILES[shopping]?.weekly ?? 4.5
  const wasteCO2    = WASTE_PROFILES[waste]?.weekly   ?? 1.6

  const total = energyCO2 + transportCO2 + flightCO2 + dietCO2 + shoppingCO2 + wasteCO2

  return {
    total: +total.toFixed(2),
    breakdown: {
      energy:    +energyCO2.toFixed(2),
      transport: +transportCO2.toFixed(2),
      flights:   +flightCO2.toFixed(2),
      diet:      +dietCO2.toFixed(2),
      shopping:  +shoppingCO2.toFixed(2),
      waste:     +wasteCO2.toFixed(2),
    }
  }
}

// ── BENCHMARKS ───────────────────────────────────────────────────
export const UK_WEEKLY_AVERAGE    = 35   // kg CO₂e/week
export const CHINA_WEEKLY_AVERAGE = 47   // kg CO₂e/week

// ── EQUIVALENCIES ────────────────────────────────────────────────
export const EQUIVALENCIES = (kg) => ({
  bulbHours:     Math.round(kg * 10),
  treeDays:      +(kg / 0.064).toFixed(1),       // avg tree absorbs ~22kg/yr
  kmByEV:        Math.round(kg / 0.037),
  phonesCharged: Math.round(kg / 0.00886),
  flightPct:     +(kg / 725 * 100).toFixed(2),   // LHR → PEK ~725 kg CO₂e
  steakEquiv:    +(kg / 12.0).toFixed(1),         // 200g beef = 12.0 kg (Poore 2018)
})
