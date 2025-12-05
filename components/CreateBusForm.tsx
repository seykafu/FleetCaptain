'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Garage {
  id: string
  name: string
  code: string
}

interface CreateBusFormProps {
  garages: Garage[]
  onBusCreated?: () => void
}

export function CreateBusForm({ garages, onBusCreated }: CreateBusFormProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [fleetNumber, setFleetNumber] = useState('')
  const [garageId, setGarageId] = useState(garages[0]?.id || '')
  const [mileage, setMileage] = useState('')
  const [status, setStatus] = useState<'AVAILABLE' | 'IN_MAINTENANCE' | 'OUT_OF_SERVICE'>('AVAILABLE')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!fleetNumber.trim()) {
      setError('Fleet number is required')
      return
    }

    if (!garageId) {
      setError('Garage is required')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/buses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fleetNumber: fleetNumber.trim(),
          garageId,
          mileage: mileage ? parseInt(mileage, 10) : null,
          status,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create bus')
      }

      setSuccess(true)
      setFleetNumber('')
      setMileage('')
      setStatus('AVAILABLE')
      setGarageId(garages[0]?.id || '')

      if (onBusCreated) {
        onBusCreated()
      }

      // Refresh the page to show the new bus in the table
      setTimeout(() => {
        router.refresh()
        setIsOpen(false)
        setSuccess(false)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bus')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
      >
        + Add New Bus
      </button>
    )
  }

  return (
    <div className="border border-borderLight rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-textMain">Create New Bus</h3>
        <button
          onClick={() => {
            setIsOpen(false)
            setError(null)
            setSuccess(false)
          }}
          className="text-textMuted hover:text-textMain"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fleetNumber" className="block text-sm font-medium text-textMain mb-1">
            Fleet Number *
          </label>
          <input
            id="fleetNumber"
            type="text"
            value={fleetNumber}
            onChange={(e) => setFleetNumber(e.target.value.toUpperCase())}
            placeholder="e.g., BUS-001"
            className="w-full px-3 py-2 border border-borderLight rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>

        <div>
          <label htmlFor="garage" className="block text-sm font-medium text-textMain mb-1">
            Garage *
          </label>
          <select
            id="garage"
            value={garageId}
            onChange={(e) => setGarageId(e.target.value)}
            className="w-full px-3 py-2 border border-borderLight rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            required
          >
            {garages.map((garage) => (
              <option key={garage.id} value={garage.id}>
                {garage.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-textMain mb-1">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="w-full px-3 py-2 border border-borderLight rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="AVAILABLE">Available</option>
            <option value="IN_MAINTENANCE">In Maintenance</option>
            <option value="OUT_OF_SERVICE">Out of Service</option>
          </select>
        </div>

        <div>
          <label htmlFor="mileage" className="block text-sm font-medium text-textMain mb-1">
            Mileage (optional)
          </label>
          <input
            id="mileage"
            type="number"
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
            placeholder="e.g., 50000"
            min="0"
            className="w-full px-3 py-2 border border-borderLight rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
            Bus created successfully!
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Bus'}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false)
              setError(null)
              setSuccess(false)
            }}
            className="px-4 py-2 border border-borderLight rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-textMain"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

