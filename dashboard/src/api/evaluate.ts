import { apiPost, apiGet } from './client'
import type { FullAnalysisResponse } from '../types/rapid-ai'

export interface EvaluateRequest {
  schema_version?: string
  asset_id: string
  timestamp_utc: string
  machine_type?: string
  system_type?: string
  signal: {
    signal_type: string
    direction: string
    unit: string
    sampling_rate_hz: number
    values: number[]
  }
  additional_signals?: Array<{
    signal_type: string
    direction: string
    unit: string
    sampling_rate_hz: number
    values: number[]
  }>
  context?: {
    rpm?: number
    temperature_c?: number
  }
  component?: string
  historical_timestamps?: string[]
  historical_values?: number[]
  criticality?: number
  failure_threshold?: number
}

export async function evaluateAsset(request: EvaluateRequest): Promise<FullAnalysisResponse> {
  return apiPost<FullAnalysisResponse>('/rapid-ai/evaluate', request)
}

export async function healthCheck(): Promise<{ status: string }> {
  return apiGet<{ status: string }>('/health')
}
