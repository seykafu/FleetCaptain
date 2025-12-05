'use client'

import { useState, useMemo } from 'react'
import { InventoryTable } from '@/components/inventory/InventoryTable'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/Card'
import { supabaseClient } from '@/lib/supabaseClient'
import { useEffect } from 'react'

export default function InventoryPage() {
  const [garageFilter, setGarageFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('')
  const [garages, setGarages] = useState<Array<{ id: string; name: string }>>([])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fetch garages for filter
  useEffect(() => {
    const fetchGarages = async () => {
      try {
        const { data, error } = await supabaseClient
          .from('garages')
          .select('id, name')
          .order('name')

        if (error) throw error
        setGarages(data || [])
      } catch (err) {
        console.error('Failed to fetch garages:', err)
      }
    }
    fetchGarages()
  }, [])

  return (
    <AppShell pageTitle="Inventory">
      <Card
        title="Inventory"
        subtitle="Spreadsheet-like editor for parts inventory."
      >
        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-textMuted uppercase tracking-wide mb-1.5">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by part name or number..."
              className="w-full border border-borderLight rounded-lg px-4 py-2 text-sm bg-white text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="sm:w-48">
            <label className="block text-xs font-medium text-textMuted uppercase tracking-wide mb-1.5">
              Garage
            </label>
            <select
              value={garageFilter}
              onChange={(e) => setGarageFilter(e.target.value)}
              className="w-full border border-borderLight rounded-lg px-4 py-2 text-sm bg-white text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Garages</option>
              {garages.map((garage) => (
                <option key={garage.id} value={garage.id}>
                  {garage.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <InventoryTable garageFilter={garageFilter} searchTerm={debouncedSearchTerm} />
      </Card>
    </AppShell>
  )
}
