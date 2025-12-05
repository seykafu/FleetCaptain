'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from './Card'

interface LogIssueFormProps {
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
    }
  }
  garages: Array<{
    id: string
    name: string
    code: string
  }>
}

export function LogIssueForm({ bus, garages }: LogIssueFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    type: 'INCIDENT',
    severity: 'MEDIUM',
    description: '',
    mechanicName: '',
    takeIntoGarage: false,
    garageId: bus.garageId,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch(`/api/bus/${bus.fleetNumber}/log-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        router.push(`/bus/${bus.fleetNumber}?success=true`)
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'Failed to log issue'}`)
      }
    } catch (error) {
      console.error('Failed to log issue:', error)
      alert('Failed to log issue. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card title="Log Issue">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-textMain mb-2">
            Issue Type
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full border border-borderLight rounded-lg px-3 py-2 text-sm bg-white text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
            required
          >
            <option value="INCIDENT">Incident</option>
            <option value="PREVENTIVE">Preventive</option>
            <option value="REPAIR">Repair</option>
            <option value="INSPECTION">Inspection</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-textMain mb-2">
            Severity
          </label>
          <select
            value={formData.severity}
            onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
            className="w-full border border-borderLight rounded-lg px-3 py-2 text-sm bg-white text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
            required
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-textMain mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full border border-borderLight rounded-lg px-3 py-2 text-sm bg-white text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
            rows={4}
            required
            placeholder="Describe the issue..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-textMain mb-2">
            Mechanic Name
          </label>
          <input
            type="text"
            value={formData.mechanicName}
            onChange={(e) => setFormData({ ...formData, mechanicName: e.target.value })}
            className="w-full border border-borderLight rounded-lg px-3 py-2 text-sm bg-white text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
            required
            placeholder="Enter your name"
          />
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.takeIntoGarage}
              onChange={(e) => setFormData({ ...formData, takeIntoGarage: e.target.checked })}
              className="w-4 h-4 text-primary border-borderLight rounded focus:ring-primary"
            />
            <span className="text-sm font-medium text-textMain">
              Bus taken into garage
            </span>
          </label>
        </div>

        {formData.takeIntoGarage && (
          <div>
            <label className="block text-sm font-medium text-textMain mb-2">
              Garage
            </label>
            <select
              value={formData.garageId}
              onChange={(e) => setFormData({ ...formData, garageId: e.target.value })}
              className="w-full border border-borderLight rounded-lg px-3 py-2 text-sm bg-white text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              {garages.map((garage) => (
                <option key={garage.id} value={garage.id}>
                  {garage.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Submitting...' : 'Log Issue'}
        </button>
      </form>
    </Card>
  )
}
