'use client'

import { useState, useEffect } from 'react'
import { Card } from './Card'

interface InventoryItemWithGarage {
  id: string
  name: string
  partNumber: string
  quantity: number
  reorderThreshold: number
  garageId: string
  updatedAt: string
  createdAt: string
  garage: {
    id: string
    name: string
    code: string
  }
}

export function InventoryTable() {
  const [items, setItems] = useState<InventoryItemWithGarage[]>([])
  const [editing, setEditing] = useState<{ id: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [filterGarage, setFilterGarage] = useState<string>('all')
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetchItems()
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchItems, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/inventory')
      const data = await response.json()
      setItems(data)
    } catch (error) {
      console.error('Failed to fetch inventory:', error)
    }
  }

  const handleEdit = (item: InventoryItemWithGarage, field: 'quantity' | 'reorderThreshold') => {
    setEditing({ id: item.id, field })
    setEditValue(String(item[field]))
  }

  const handleSave = async (itemId: string, field: string) => {
    setSaving(itemId)
    try {
      const response = await fetch(`/api/inventory/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: parseInt(editValue) }),
      })

      if (response.ok) {
        const updated = await response.json()
        setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...updated } : i)))
        setEditing(null)
        setSaving(null)
      }
    } catch (error) {
      console.error('Failed to update inventory:', error)
      setSaving(null)
    }
  }

  const handleCancel = () => {
    setEditing(null)
    setEditValue('')
  }

  const filteredItems = items.filter((item) => {
    if (filterGarage === 'all') return true
    return item.garageId === filterGarage
  })

  // Fetch garages separately for the filter dropdown
  const [allGarages, setAllGarages] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    const fetchGarages = async () => {
      try {
        const response = await fetch('/api/garages')
        if (response.ok) {
          const garages = await response.json()
          setAllGarages(garages || [])
        }
      } catch (error) {
        console.error('Failed to fetch garages:', error)
      }
    }
    fetchGarages()
  }, [])

  // Get unique garages from items as fallback
  const garagesFromItems = Array.from(
    new Map(
      items
        .filter((i) => i.garage !== null)
        .map((i) => [i.garage!.id, i.garage!])
    ).values()
  )

  // Use fetched garages if available, otherwise use garages from items
  const garages = allGarages.length > 0 ? allGarages : garagesFromItems

  return (
    <Card title="Inventory">
      <div className="mb-4">
        <select
          value={filterGarage}
          onChange={(e) => setFilterGarage(e.target.value)}
          className="text-sm border border-borderLight rounded-lg px-3 py-2 bg-white text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Garages</option>
          {garages.map((garage) => (
            <option key={garage.id} value={garage.id}>
              {garage.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-[#F9FBFF] border-b border-borderLight">
              <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                Part
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                Part Number
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                Threshold
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                Garage
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                Last Updated
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borderLight">
            {filteredItems.map((item) => (
              <tr
                key={item.id}
                className={`hover:bg-gray-50 transition-colors ${
                  item.quantity <= item.reorderThreshold ? 'bg-red-50' : ''
                }`}
              >
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-textMain">
                  {item.name}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-textMuted">
                  {item.partNumber}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-textMuted">
                  {editing?.id === item.id && editing.field === 'quantity' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSave(item.id, 'quantity')
                          if (e.key === 'Escape') handleCancel()
                        }}
                        onBlur={() => handleSave(item.id, 'quantity')}
                        className="w-20 border border-primary rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        autoFocus
                      />
                      {saving === item.id && (
                        <span className="text-xs text-textMuted">Saving...</span>
                      )}
                    </div>
                  ) : (
                    <span
                      className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                      onClick={() => handleEdit(item, 'quantity')}
                    >
                      {item.quantity}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-textMuted">
                  {editing?.id === item.id && editing.field === 'reorderThreshold' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSave(item.id, 'reorderThreshold')
                          if (e.key === 'Escape') handleCancel()
                        }}
                        onBlur={() => handleSave(item.id, 'reorderThreshold')}
                        className="w-20 border border-primary rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        autoFocus
                      />
                      {saving === item.id && (
                        <span className="text-xs text-textMuted">Saving...</span>
                      )}
                    </div>
                  ) : (
                    <span
                      className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                      onClick={() => handleEdit(item, 'reorderThreshold')}
                    >
                      {item.reorderThreshold}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-textMuted">
                  {item.garage?.name || 'N/A'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-textMuted">
                  {new Date(item.updatedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
