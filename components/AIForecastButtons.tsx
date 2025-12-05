'use client'

import { useState } from 'react'
import { Card } from './Card'

interface ForecastResult {
  targetDate: string
  availableBusCount: number
  unavailableBusCount: number
  highRiskBusCount: number
  reasoning: string
}

export function AIForecastButtons() {
  const [loading, setLoading] = useState<'tomorrow' | 'week' | 'twoWeeks' | null>(null)
  const [results, setResults] = useState<{
    tomorrow?: ForecastResult
    week?: ForecastResult
    twoWeeks?: ForecastResult
  }>({})
  const [error, setError] = useState<string | null>(null)

  const generateForecast = async (days: number, label: 'tomorrow' | 'week' | 'twoWeeks') => {
    setLoading(label)
    setError(null)

    try {
      const response = await fetch('/api/ai/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      })

      if (response.ok) {
        const data = await response.json()
        setResults((prev) => ({
          ...prev,
          [label]: data.forecast,
        }))
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to generate forecast')
      }
    } catch (err) {
      console.error('Forecast error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate forecast')
    } finally {
      setLoading(null)
    }
  }

  return (
    <Card
      title="AI-Powered Forecasts"
      subtitle="Generate intelligent predictions using AI analysis of your fleet data"
    >
      <div className="space-y-6">
        {/* Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => generateForecast(1, 'tomorrow')}
            disabled={loading === 'tomorrow'}
            className="bg-primary text-white px-6 py-4 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {loading === 'tomorrow' ? 'Generating...' : 'Calculate Tomorrow'}
          </button>
          <button
            onClick={() => generateForecast(7, 'week')}
            disabled={loading === 'week'}
            className="bg-primary text-white px-6 py-4 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {loading === 'week' ? 'Generating...' : 'Calculate 1 Week'}
          </button>
          <button
            onClick={() => generateForecast(14, 'twoWeeks')}
            disabled={loading === 'twoWeeks'}
            className="bg-primary text-white px-6 py-4 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {loading === 'twoWeeks' ? 'Generating...' : 'Calculate 2 Weeks'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Results */}
        {(results.tomorrow || results.week || results.twoWeeks) && (
          <div className="space-y-4">
            {results.tomorrow && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-textMain mb-2">
                  Tomorrow ({new Date(results.tomorrow.targetDate).toLocaleDateString()})
                </h4>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <div className="text-xs text-textMuted uppercase tracking-wide mb-1">Available</div>
                    <div className="text-2xl font-semibold text-statusGreen">{results.tomorrow.availableBusCount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-textMuted uppercase tracking-wide mb-1">Unavailable</div>
                    <div className="text-2xl font-semibold text-statusRed">{results.tomorrow.unavailableBusCount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-textMuted uppercase tracking-wide mb-1">High Risk</div>
                    <div className="text-2xl font-semibold text-orange-600">{results.tomorrow.highRiskBusCount}</div>
                  </div>
                </div>
                <div className="text-sm text-textMuted">
                  <strong>AI Reasoning:</strong> {results.tomorrow.reasoning}
                </div>
              </div>
            )}

            {results.week && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-textMain mb-2">
                  1 Week ({new Date(results.week.targetDate).toLocaleDateString()})
                </h4>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <div className="text-xs text-textMuted uppercase tracking-wide mb-1">Available</div>
                    <div className="text-2xl font-semibold text-statusGreen">{results.week.availableBusCount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-textMuted uppercase tracking-wide mb-1">Unavailable</div>
                    <div className="text-2xl font-semibold text-statusRed">{results.week.unavailableBusCount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-textMuted uppercase tracking-wide mb-1">High Risk</div>
                    <div className="text-2xl font-semibold text-orange-600">{results.week.highRiskBusCount}</div>
                  </div>
                </div>
                <div className="text-sm text-textMuted">
                  <strong>AI Reasoning:</strong> {results.week.reasoning}
                </div>
              </div>
            )}

            {results.twoWeeks && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-textMain mb-2">
                  2 Weeks ({new Date(results.twoWeeks.targetDate).toLocaleDateString()})
                </h4>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <div className="text-xs text-textMuted uppercase tracking-wide mb-1">Available</div>
                    <div className="text-2xl font-semibold text-statusGreen">{results.twoWeeks.availableBusCount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-textMuted uppercase tracking-wide mb-1">Unavailable</div>
                    <div className="text-2xl font-semibold text-statusRed">{results.twoWeeks.unavailableBusCount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-textMuted uppercase tracking-wide mb-1">High Risk</div>
                    <div className="text-2xl font-semibold text-orange-600">{results.twoWeeks.highRiskBusCount}</div>
                  </div>
                </div>
                <div className="text-sm text-textMuted">
                  <strong>AI Reasoning:</strong> {results.twoWeeks.reasoning}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

