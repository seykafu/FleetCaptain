'use client'

import { useState } from 'react'

export function DatabaseSeedButton() {
  const [seeding, setSeeding] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; details?: any } | null>(null)

  const handleSeed = async () => {
    if (!confirm('This will create North Garage (175 buses) and South Garage (125 buses). Continue?')) {
      return
    }

    setSeeding(true)
    setResult(null)

    try {
      const response = await fetch('/api/seed', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || 'Database seeded successfully!',
          details: data,
        })
        // Refresh the page after a delay to show updated counts
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to seed database',
          details: data.details,
        })
      }
    } catch (error) {
      console.error('Failed to seed database:', error)
      setResult({
        success: false,
        message: 'Failed to seed database. Please check the console.',
      })
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleSeed}
        disabled={seeding}
        className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {seeding ? 'Seeding Database...' : 'Seed Database (Create Garages & 300 Buses)'}
      </button>

      {result && (
        <div
          className={`p-3 rounded-lg border ${
            result.success
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <p className="text-sm font-medium mb-1">{result.message}</p>
          {result.details && (
            <div className="text-xs mt-2 space-y-1">
              {result.details.busesCreated !== undefined && (
                <p>• Buses created: {result.details.busesCreated}</p>
              )}
              {result.details.busesExisting !== undefined && (
                <p>• Buses already existed: {result.details.busesExisting}</p>
              )}
              {result.details.errors && result.details.errors.length > 0 && (
                <div className="mt-2">
                  <p className="font-semibold">Errors:</p>
                  <ul className="list-disc list-inside">
                    {result.details.errors.map((err: string, idx: number) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.details.details && (
                <p className="text-red-600">Details: {result.details.details}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
