import React, { createContext, useContext, useState, useMemo } from 'react'
import { FLEET } from './data/fleet'
import { MARKET_RATES } from './utils/carbonEconomics'

const FleetContext = createContext()

export function FleetProvider({ children }) {
  const [uploadedFleet, setUploadedFleet] = useState(null)
  const [marketRates, setMarketRates] = useState(MARKET_RATES)

  const activeFleet = useMemo(() => uploadedFleet || FLEET, [uploadedFleet])

  const fleetSummary = useMemo(() => {
    const totalMonthlyEmissions = activeFleet.reduce((s, v) => s + (v.emPerMonth || 0), 0)
    const byType = {}
    activeFleet.forEach((v) => {
      byType[v.type] = (byType[v.type] || 0) + (v.emPerMonth || 0)
    })
    const hotspots = [...activeFleet].sort((a, b) => (b.emPerMonth || 0) - (a.emPerMonth || 0)).slice(0, 5)
    
    return {
      totalMonthlyEmissions: +totalMonthlyEmissions.toFixed(3),
      byType,
      hotspots,
      count: activeFleet.length,
      isDemo: !uploadedFleet
    }
  }, [activeFleet, uploadedFleet])

  const value = {
    activeFleet,
    uploadedFleet,
    setUploadedFleet,
    marketRates,
    setMarketRates,
    fleetSummary
  }

  return (
    <FleetContext.Provider value={value}>
      {children}
    </FleetContext.Provider>
  )
}

export function useFleet() {
  const context = useContext(FleetContext)
  if (!context) {
    throw new Error('useFleet must be used within a FleetProvider')
  }
  return context
}
