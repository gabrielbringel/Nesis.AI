import type { AnalyzeResponse } from '../types'
import { FALLBACK_RESPONSE, MOCK_PAYLOAD } from '../mock'

export async function callAnalyze(): Promise<AnalyzeResponse> {
  try {
    const res = await fetch('/api/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(MOCK_PAYLOAD),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as AnalyzeResponse
  } catch {
    console.warn('API indisponível — usando fallback.')
    return FALLBACK_RESPONSE
  }
}
