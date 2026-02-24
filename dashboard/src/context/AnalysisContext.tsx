import { createContext, useContext, useState, useCallback } from 'react'
import type { FullAnalysisResponse } from '../types/rapid-ai'
import type { EvaluateRequest } from '../api/evaluate'
import { evaluateAsset } from '../api/evaluate'

interface AnalysisState {
  result: FullAnalysisResponse | null
  request: EvaluateRequest | null
  isLoading: boolean
  error: string | null
  runAnalysis: (req: EvaluateRequest) => Promise<void>
  clearResult: () => void
}

const AnalysisContext = createContext<AnalysisState | null>(null)

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [result, setResult] = useState<FullAnalysisResponse | null>(null)
  const [request, setRequest] = useState<EvaluateRequest | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runAnalysis = useCallback(async (req: EvaluateRequest) => {
    setIsLoading(true)
    setError(null)
    setRequest(req)
    try {
      const resp = await evaluateAsset(req)
      setResult(resp)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearResult = useCallback(() => {
    setResult(null)
    setRequest(null)
    setError(null)
  }, [])

  return (
    <AnalysisContext.Provider value={{ result, request, isLoading, error, runAnalysis, clearResult }}>
      {children}
    </AnalysisContext.Provider>
  )
}

export function useAnalysis() {
  const ctx = useContext(AnalysisContext)
  if (!ctx) throw new Error('useAnalysis must be used within AnalysisProvider')
  return ctx
}
