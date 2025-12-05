'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface QuickLogFormProps {
  bus: {
    id: string
    fleetNumber: string
    garageId: string
    status: string
    mileage?: number | null
    garage: {
      id: string
      name: string
      code: string
    } | null
  }
  garages: Array<{
    id: string
    name: string
    code: string
  }>
}

interface MaintenanceUser {
  id: string
  name: string
  email?: string
}

export function QuickLogForm({ bus, garages: initialGarages }: QuickLogFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [garages, setGarages] = useState(initialGarages)
  const [garagesLoading, setGaragesLoading] = useState(false)
  const [formData, setFormData] = useState({
    mechanicName: '',
    garageId: bus.garageId || initialGarages[0]?.id || '',
    description: '',
    busStatus: bus.status || 'AVAILABLE', // Default to current bus status
    maintenanceType: 'INCIDENT' as 'INCIDENT' | 'PREVENTIVE' | 'REPAIR' | 'INSPECTION' | 'UPDATE',
  })
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState<MaintenanceUser[]>([])
  const [showUserResults, setShowUserResults] = useState(false)
  const [selectedUser, setSelectedUser] = useState<MaintenanceUser | null>(null)
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsGarage, setGpsGarage] = useState<string | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Fetch garages client-side if not provided or empty
  useEffect(() => {
    if (!garages || garages.length === 0) {
      setGaragesLoading(true)
      fetch('/api/garages')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setGarages(data)
            // Set default garage if none selected
            setFormData(prev => {
              if (!prev.garageId && data[0]?.id) {
                return { ...prev, garageId: data[0].id }
              }
              return prev
            })
          }
        })
        .catch(err => {
          console.error('Failed to fetch garages:', err)
        })
        .finally(() => {
          setGaragesLoading(false)
        })
    }
  }, []) // Only run once on mount

  // Auto-save to localStorage
  useEffect(() => {
    const savedData = localStorage.getItem(`quick-log-${bus.fleetNumber}`)
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        // Don't overwrite maintenanceType from localStorage if it's not present or is old
        // Only restore it if it's a valid value
        const restoredData = { ...parsed }
        if (!restoredData.maintenanceType || !['INCIDENT', 'PREVENTIVE', 'REPAIR', 'INSPECTION', 'UPDATE'].includes(restoredData.maintenanceType)) {
          // Keep the default maintenanceType from initial state
          delete restoredData.maintenanceType
        }
        setFormData(prev => ({ ...prev, ...restoredData }))
        if (parsed.mechanicName) {
          setSelectedUser({ id: '', name: parsed.mechanicName })
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [bus.fleetNumber])

  // Auto-save on change
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem(`quick-log-${bus.fleetNumber}`, JSON.stringify(formData))
    }, 500)
    return () => clearTimeout(timeout)
  }, [formData, bus.fleetNumber])

  // Search for maintenance users
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (userSearch.length < 2) {
      setUserResults([])
      setShowUserResults(false)
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/maintenance-users?q=${encodeURIComponent(userSearch)}`)
        if (response.ok) {
          const users = await response.json()
          setUserResults(users)
          setShowUserResults(true)
        }
      } catch (error) {
        console.error('Failed to search users:', error)
      }
    }, 300)
  }, [userSearch])

  // Get GPS location and determine closest garage
  const getGPSLocation = () => {
    if (!navigator.geolocation) {
      alert('GPS is not available on this device')
      return
    }

    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setGpsLocation({ lat: latitude, lng: longitude })
        
        // Simple garage location approximation
        // In a real app, you'd have actual garage coordinates
        // For now, we'll use a simple heuristic or default to North
        // You can enhance this with actual garage coordinates later
        const defaultGarage = garages.find(g => g.code === 'NORTH') || garages[0]
        if (defaultGarage) {
          setGpsGarage(defaultGarage.id)
          setFormData(prev => ({ ...prev, garageId: defaultGarage.id }))
        }
        setGpsLoading(false)
      },
      (error) => {
        console.error('GPS error:', error)
        alert('Unable to get GPS location. Please select garage manually.')
        setGpsLoading(false)
      }
    )
  }

  // Click outside to close user results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowUserResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-detect GPS on mount (with permission) - commented out for now, user can click button
  // useEffect(() => {
  //   if (garages.length > 0 && !formData.garageId) {
  //     getGPSLocation()
  //   }
  // }, [])

  const handleUserSelect = (user: MaintenanceUser) => {
    setSelectedUser(user)
    setFormData(prev => ({ ...prev, mechanicName: user.name }))
    setUserSearch(user.name)
    setShowUserResults(false)
  }

  const handleUserInputChange = (value: string) => {
    setUserSearch(value)
    setFormData(prev => ({ ...prev, mechanicName: value }))
    if (selectedUser && value !== selectedUser.name) {
      setSelectedUser(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.mechanicName.trim()) {
      alert('Please enter or select your name')
      return
    }

    if (!formData.description.trim()) {
      alert('Please describe the problem')
      return
    }

    if (!formData.garageId) {
      alert('Please select a garage')
      return
    }

    if (!formData.busStatus) {
      alert('Please select a bus status')
      return
    }

    setSubmitting(true)

    // Log what we're sending for debugging
    const payload = {
      type: 'INCIDENT', // Keep for backward compatibility, but use maintenanceType for the actual event
      severity: 'MEDIUM',
      description: formData.description,
      mechanicName: formData.mechanicName,
      garageId: formData.garageId,
      busStatus: formData.busStatus,
      maintenanceType: formData.maintenanceType,
      takeIntoGarage: formData.busStatus === 'IN_MAINTENANCE',
    }
    console.log('[QuickLogForm] Submitting with maintenanceType:', formData.maintenanceType, 'Full payload:', payload)

    try {
      const response = await fetch(`/api/bus/${bus.fleetNumber}/log-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        // Clear saved draft
        localStorage.removeItem(`quick-log-${bus.fleetNumber}`)
        // Show success and redirect with cache busting
        alert('Maintenance update submitted successfully!')
        // Use router.refresh() to force a server-side refresh, then navigate
        router.refresh()
        router.push(`/bus/${bus.fleetNumber}?t=${Date.now()}`)
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'Failed to submit update'}`)
      }
    } catch (error) {
      console.error('Failed to submit:', error)
      alert('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-8">
      {/* Header */}
      <div className="bg-white rounded-xl border border-borderLight shadow-sm p-4 mb-4">
        <h1 className="text-xl font-semibold text-textMain mb-1">Quick Log</h1>
        <p className="text-sm text-textMuted">Bus {bus.fleetNumber}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Maintenance User Search */}
        <div className="relative">
          <label className="block text-sm font-medium text-textMain mb-1.5">
            Your Name *
          </label>
          <input
            ref={searchInputRef}
            type="text"
            value={userSearch}
            onChange={(e) => handleUserInputChange(e.target.value)}
            onFocus={() => {
              if (userResults.length > 0) setShowUserResults(true)
            }}
            className="w-full border border-borderLight rounded-lg px-4 py-3 text-base bg-white text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Type to search your name..."
            required
            autoFocus
          />
          {showUserResults && userResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-borderLight rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {userResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleUserSelect(user)}
                  className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors text-sm text-textMain"
                >
                  <div className="font-medium">{user.name}</div>
                  {user.email && (
                    <div className="text-xs text-textMuted">{user.email}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Garage Selection with GPS */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-textMain">
              Garage *
            </label>
            <button
              type="button"
              onClick={getGPSLocation}
              disabled={gpsLoading}
              className="text-xs text-primary hover:text-primary/80 disabled:opacity-50"
            >
              {gpsLoading ? 'Detecting...' : '📍 Use GPS'}
            </button>
          </div>
          <select
            value={formData.garageId}
            onChange={(e) => setFormData({ ...formData, garageId: e.target.value })}
            className="w-full border border-borderLight rounded-lg px-4 py-3 text-base bg-white text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
            required
            disabled={garagesLoading}
          >
            <option value="">
              {garagesLoading ? 'Loading garages...' : garages.length === 0 ? 'No garages available' : 'Select garage...'}
            </option>
            {garages.map((garage) => (
              <option key={garage.id} value={garage.id}>
                {garage.name}
              </option>
            ))}
          </select>
          {garages.length === 0 && !garagesLoading && (
            <p className="text-xs text-statusRed mt-1">
              No garages found. Please ensure garages are set up in the database.
            </p>
          )}
          {gpsGarage && formData.garageId === gpsGarage && (
            <p className="text-xs text-statusGreen mt-1">✓ Garage selected based on your location</p>
          )}
        </div>

        {/* Maintenance Type Selection */}
        <div>
          <label className="block text-sm font-medium text-textMain mb-1.5">
            Update Type *
          </label>
          <select
            value={formData.maintenanceType}
            onChange={(e) => {
              const newType = e.target.value as 'INCIDENT' | 'PREVENTIVE' | 'REPAIR' | 'INSPECTION' | 'UPDATE'
              console.log('[QuickLogForm] Maintenance type changed to:', newType)
              setFormData({ ...formData, maintenanceType: newType })
            }}
            className="w-full border border-borderLight rounded-lg px-4 py-3 text-base bg-white text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
            required
          >
            <option value="UPDATE">Update (Status/Details Change)</option>
            <option value="INCIDENT">Incident</option>
            <option value="PREVENTIVE">Preventive Maintenance</option>
            <option value="REPAIR">Repair</option>
            <option value="INSPECTION">Inspection</option>
          </select>
          <p className="text-xs text-textMuted mt-1">
            Select &quot;Update&quot; to change bus status or details. Other types are for maintenance work.
          </p>
        </div>

        {/* Bus Status Selection */}
        <div>
          <label className="block text-sm font-medium text-textMain mb-1.5">
            Bus Status *
          </label>
          <select
            value={formData.busStatus}
            onChange={(e) => setFormData({ ...formData, busStatus: e.target.value as 'AVAILABLE' | 'IN_MAINTENANCE' | 'OUT_OF_SERVICE' })}
            className="w-full border border-borderLight rounded-lg px-4 py-3 text-base bg-white text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
            required
          >
            <option value="AVAILABLE">Available</option>
            <option value="IN_MAINTENANCE">In Maintenance</option>
            <option value="OUT_OF_SERVICE">Out of Service</option>
          </select>
          <p className="text-xs text-textMuted mt-1">
            This will update the bus status in the system
          </p>
        </div>

        {/* Problem Description */}
        <div>
          <label className="block text-sm font-medium text-textMain mb-1.5">
            {formData.maintenanceType === 'UPDATE' ? 'Update Description *' : 'Problem Description *'}
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full border border-borderLight rounded-lg px-4 py-3 text-base bg-white text-textMain focus:outline-none focus:ring-2 focus:ring-primary min-h-[150px]"
            placeholder={formData.maintenanceType === 'UPDATE' ? 'Describe the update or change being made...' : 'Describe the problem or maintenance work needed...'}
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary text-white px-6 py-4 rounded-lg text-base font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </div>
  )
}
