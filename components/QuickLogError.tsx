'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface QuickLogErrorProps {
  fleetNumber: string
  error?: string
}

export function QuickLogError({ fleetNumber, error }: QuickLogErrorProps) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  const createBus = async () => {
    setCreating(true)
    try {
      // Get garages first
      const garagesRes = await fetch('/api/garages')
      const garages = await garagesRes.json()
      
      if (!garages || garages.length === 0) {
        alert('No garages found. Please set up garages first.')
        return
      }

      // Create bus with first garage as default
      const response = await fetch('/api/buses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fleetNumber,
          garageId: garages[0].id,
        }),
      })

      if (response.ok) {
        // Reload the page to show the form
        router.refresh()
      } else {
        const errorData = await response.json()
        alert(`Failed to create bus: ${errorData.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Failed to create bus:', err)
      alert('Failed to create bus. Please contact support.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-borderLight shadow-sm p-6 max-w-md w-full">
        <div className="text-center space-y-4">
          <div className="text-4xl">🚌</div>
          <h1 className="text-xl font-semibold text-textMain">Bus Not Found</h1>
          <p className="text-sm text-textMuted">
            Bus <strong>{fleetNumber}</strong> is not in the system.
          </p>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-3 pt-4">
            <button
              onClick={createBus}
              disabled={creating}
              className="w-full bg-primary text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? 'Creating Bus...' : 'Create Bus & Continue'}
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-gray-100 text-textMain px-6 py-3 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>

          <p className="text-xs text-textMuted pt-2">
            Or contact your administrator to add this bus to the system.
          </p>
        </div>
      </div>
    </div>
  )
}

