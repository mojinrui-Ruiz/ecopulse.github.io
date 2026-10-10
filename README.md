# EcoPulse — Carbon Feedback Prototype

A Research-through-Design prototype exploring emotionally-driven eco-feedback interfaces for Chinese international students at the University of Edinburgh.

---

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`


## Pages

| Page | Description |
|------|-------------|
| Overview | Weekly carbon score, equivalency breakdown, navigation |
| City Map | Satellite map with Edinburgh landmarks, scenario-based decisions, progressive smog overlay |
| Carbon Score | Full results with equivalencies and UK average comparison |
| Future View | Multi-year projection with reduction target slider |
| Data Sources | Full emission factor table with sources and plain-language equivalencies |
| Survival Game | Turn-based decision game with energy, budget, and carbon constraints |

---

## Emission Factors

All values are Edinburgh only. Sourced from DEFRA 2023 and Poore & Nemecek (2018).

| Category | Activity | Value | Unit | Source |
|----------|----------|-------|------|--------|
| Energy | UK grid electricity | 0.207074 | kg CO₂e/kWh | DEFRA 2023, UK electricity sheet |
| Energy | Natural gas | 0.20226 | kg CO₂e/kWh | DEFRA 2023, Fuels sheet |
| Transport | Petrol car | 0.16983 | kg CO₂e/km | DEFRA 2023, Passenger vehicles sheet |
| Transport | Diesel car | 0.16391 | kg CO₂e/km | DEFRA 2023, Passenger vehicles sheet |
| Transport | Local bus | 0.089 | kg CO₂e/km | DEFRA 2023, SECR kWh pass sheet |
| Transport | National rail | 0.035 | kg CO₂e/km | DEFRA 2023, SECR kWh pass sheet |
| Transport | Taxi / Uber | 0.16983 | kg CO₂e/km | DEFRA 2023, Passenger vehicles sheet (proxy) |
| Flights | Long-haul to/from UK (economy + RF) | 0.20011 | kg CO₂e/km | DEFRA 2023, Business travel-air sheet |
| Flights | Short-haul to/from UK (economy + RF) | 0.18592 | kg CO₂e/km | DEFRA 2023, Business travel-air sheet |
| Food | Beef | 60.0 | kg CO₂e/kg | Poore & Nemecek (2018) |
| Food | Poultry | 6.0 | kg CO₂e/kg | Poore & Nemecek (2018) |
| Food | Vegetables | 0.4 | kg CO₂e/kg | Poore & Nemecek (2018) |
| Shopping | New clothing | 8.92 | kg CO₂e/garment | DEFRA 2023, Material use sheet (22,310 kg/tonne × 0.4 kg) |
| Shopping | Second-hand clothing | 0.06 | kg CO₂e/garment | DEFRA 2023, Material use sheet (152.25 kg/tonne × 0.4 kg) |
| Waste | Food waste (landfill) | 700.210 | kg CO₂e/tonne | DEFRA 2023, Waste disposal sheet |
| Waste | Food waste (composting) | 8.912 | kg CO₂e/tonne | DEFRA 2023, Waste disposal sheet |

---

## Tech Stack

- React 18 + Vite
- Mapbox GL JS v3.2.0


---

## Research Context

RtD prototype informing an MSc dissertation at the University of Edinburgh, supervised by Dr Susan Lechelt. Design decisions draw on Fogg (2002), Norman (2004), Lim et al. (2009), Kizilcec (2016), and Schultz et al. (2007).