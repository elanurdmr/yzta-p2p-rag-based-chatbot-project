'use client'

// app/layout-context.ts — layout genelinde paylaşılan state için React context
// agentId ve currentThreadId'yi prop drilling olmadan alt bileşenlere ulaştırıyor

import { createContext, useContext } from 'react'

type LayoutContextType = {
  agentId: string
  setAgentId: (agentId: string) => void
  currentThreadId: string | null
  setCurrentThreadId: (currentThreadId: string | null) => void
}

export const LayoutContext = createContext<LayoutContextType | null>(null)

export function useLayoutContext() {
  const context = useContext(LayoutContext)
  // null check — Provider dışında kullanılırsa hemen fark edilsin
  if (!context) {
    throw new Error('useLayoutContext must be used within a LayoutProvider')
  }
  return context
}
