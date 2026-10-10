import { createContext, useContext, useState, useCallback } from 'react'
import { calculateCarbon } from './carbonEngine'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [page, setPage] = useState('landing')


  const city = 'edinburgh'

  // Session carbon: accumulated from City Map choices
  // Starts at 0, updated by MapPage onChoice callbacks
  const [sessionCarbon, setSessionCarbon] = useState(0)
  const [sessionBreakdown, setSessionBreakdown] = useState({
    transport: 0,
    energy: 0,
    food: 0,
    shopping: 0,
    waste: 0,
    flights: 0,
  })

  const addSessionCarbon = useCallback((amount, category = 'transport') => {
    setSessionCarbon(prev => +(prev + amount).toFixed(3))
    setSessionBreakdown(prev => ({
      ...prev,
      [category]: +((prev[category] || 0) + amount).toFixed(3),
    }))
  }, [])

  const resetSession = useCallback(() => {
    setSessionCarbon(0)
    setSessionBreakdown({ transport:0, energy:0, food:0, shopping:0, waste:0, flights:0 })
  }, [])

  return (
    <AppContext.Provider value={{
      city,
      page, setPage,
      sessionCarbon, sessionBreakdown,
      addSessionCarbon, resetSession,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
