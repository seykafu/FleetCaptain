'use client'

import { useState, useEffect } from 'react'

interface Garage {
  id: string
  name: string
  code: string
}

export function GarageStatus() {
  const [garages, setGarages] = useState<Garage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const checkGarages = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/garages')
      if (response.ok) {
        const data = await response.json()
        setGarages(data || [])
        if (data && data.length > 0) {
          setSuccess(`${data.length} garage(s) found`)
        } else {
          setError('No garages found')
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to fetch garages')
      }
    } catch (err) {
      setError('Failed to check garages')
      console.error('Error checking garages:', err)
    } finally {
      setLoading(false)
    }
  }

  const createGarages = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/garages', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess('Garages created successfully!')
        // Refresh the list
        await checkGarages()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to create garages')
      }
    } catch (err) {
      setError('Failed to create garages')
      console.error('Error creating garages:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkGarages()
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-textMain mb-1">Garage Status</h3>
          <p className="text-xs text-textMuted">
            Ensure North and South garages are set up in the database
          </p>
        </div>
        <button
          onClick={checkGarages}
          disabled={loading}
          className="text-xs px-3 py-1.5 border border-borderLight rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      {garages.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-green-800 mb-2">Garages Found:</p>
          <ul className="text-xs text-green-700 space-y-1">
            {garages.map((garage) => (
              <li key={garage.id}>
                • {garage.name} ({garage.code})
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs text-green-800">{success}</p>
        </div>
      )}

      {garages.length === 0 && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-xs text-yellow-800 mb-3">
            No garages found. Click the button below to create North and South garages.
          </p>
          <button
            onClick={createGarages}
            disabled={loading}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Garages'}
          </button>
        </div>
      )}
    </div>
  )
}

