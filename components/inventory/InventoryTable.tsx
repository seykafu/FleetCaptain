'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { supabaseClient } from '@/lib/supabaseClient'
import { TrashIcon } from '@heroicons/react/24/outline'
import { EditableCell } from './EditableCell'

interface InventoryItem {
  id: string
  name: string
  part_number: string
  quantity: number
  reorder_threshold: number
  garage_id: string
  updated_at: string
  created_at: string
  garage?: {
    id: string
    name: string
    code: string
  } | null
}

interface Garage {
  id: string
  name: string
  code: string
}

interface InventoryTableProps {
  garageFilter: string
  searchTerm: string
}

export function InventoryTable({ garageFilter, searchTerm }: InventoryTableProps) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [garages, setGarages] = useState<Garage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch garages
  const fetchGarages = useCallback(async () => {
    try {
      const { data, error: garagesError } = await supabaseClient
        .from('garages')
        .select('id, name, code')
        .order('name')

      if (garagesError) throw garagesError
      setGarages(data || [])
    } catch (err) {
      console.error('Failed to fetch garages:', err)
    }
  }, [])

  // Fetch inventory items
  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabaseClient
        .from('inventory_items')
        .select('*')
        .order('updated_at', { ascending: false })

      const { data, error: itemsError } = await query

      if (itemsError) throw itemsError

      // Fetch garages for each item
      const garageIds = [...new Set((data || []).map((item: InventoryItem) => item.garage_id))]
      const { data: garagesData } = await supabaseClient
        .from('garages')
        .select('id, name, code')
        .in('id', garageIds)

      const garageMap = new Map((garagesData || []).map((g: Garage) => [g.id, g]))

      const itemsWithGarages = (data || []).map((item: InventoryItem) => ({
        ...item,
        garage: garageMap.get(item.garage_id) || null,
      }))

      setItems(itemsWithGarages)
    } catch (err) {
      console.error('Failed to fetch inventory:', err)
      setError(err instanceof Error ? err.message : 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGarages()
    fetchItems()
  }, [fetchGarages, fetchItems])

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabaseClient
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_items',
        },
        () => {
          // Refetch on any change
          fetchItems()
        }
      )
      .subscribe()

    return () => {
      supabaseClient.removeChannel(channel)
    }
  }, [fetchItems])

  // Optimistic update helper
  const updateItemOptimistically = (id: string, updates: Partial<InventoryItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    )
  }

  // Save handler
  const handleSave = useCallback(
    async (id: string, field: keyof InventoryItem, value: string | number) => {
      const oldItem = items.find((item) => item.id === id)
      if (!oldItem) return

      // Optimistic update
      updateItemOptimistically(id, { [field]: value, updated_at: new Date().toISOString() })

      try {
        const updateData = {
          [field]: value,
          updated_at: new Date().toISOString(),
        }
        const { error: updateError } = await ((supabaseClient
          .from('inventory_items') as any)
          .update(updateData)
          .eq('id', id))

        if (updateError) {
          // Revert on error
          if (oldItem) {
            updateItemOptimistically(id, oldItem)
          }
          throw updateError
        }
      } catch (err) {
        // Error already handled by optimistic revert
        throw err
      }
    },
    [items]
  )

  // Delete handler
  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Are you sure you want to delete this item?')) return

      const oldItems = items
      // Optimistic delete
      setItems((prev) => prev.filter((item) => item.id !== id))

      try {
        const { error: deleteError } = await supabaseClient
          .from('inventory_items')
          .delete()
          .eq('id', id)

        if (deleteError) {
          // Revert on error
          setItems(oldItems)
          throw deleteError
        }
      } catch (err) {
        alert('Failed to delete item. Please try again.')
        console.error('Delete error:', err)
      }
    },
    [items]
  )

  // Add new item
  const handleAdd = useCallback(async () => {
    const defaultGarageId =
      garageFilter !== 'all'
        ? garageFilter
        : garages.find((g) => g.code === 'NORTH')?.id || garages[0]?.id

    if (!defaultGarageId) {
      alert('Please ensure at least one garage exists')
      return
    }

    const newItem: Partial<InventoryItem> = {
      name: 'New Part',
      part_number: '',
      quantity: 0,
      reorder_threshold: 0,
      garage_id: defaultGarageId,
    }

    // Optimistic add
    const tempId = `temp-${Date.now()}`
    const optimisticItem: InventoryItem = {
      id: tempId,
      name: newItem.name!,
      part_number: newItem.part_number!,
      quantity: newItem.quantity!,
      reorder_threshold: newItem.reorder_threshold!,
      garage_id: newItem.garage_id!,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      garage: garages.find((g) => g.id === defaultGarageId) || null,
    }

    setItems((prev) => [optimisticItem, ...prev])

    try {
      const { data, error: insertError } = await ((supabaseClient
        .from('inventory_items') as any)
        .insert(newItem)
        .select()
        .single())

      if (insertError) throw insertError

      // Fetch garage for the new item
      const { data: garageData } = await supabaseClient
        .from('garages')
        .select('id, name, code')
        .eq('id', data.garage_id)
        .single()

      // Replace optimistic item with real one
      setItems((prev) =>
        prev.map((item) => (item.id === tempId ? { ...data, garage: garageData || null } : item))
      )

      // Scroll to new row and focus first editable cell
      setTimeout(() => {
        const row = document.querySelector(`[data-row-id="${data.id}"]`)
        if (row) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' })
          const firstEditable = row.querySelector('[data-editable="true"]')
          if (firstEditable instanceof HTMLElement) {
            firstEditable.click()
          }
        }
      }, 100)
    } catch (err) {
      // Revert on error
      setItems((prev) => prev.filter((item) => item.id !== tempId))
      alert('Failed to add item. Please try again.')
      console.error('Add error:', err)
    }
  }, [garageFilter, garages])

  // Filter data
  const filteredData = useMemo(() => {
    let filtered = items

    // Garage filter
    if (garageFilter !== 'all') {
      filtered = filtered.filter((item) => item.garage_id === garageFilter)
    }

    // Search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.part_number.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }, [items, garageFilter, searchTerm])

  // Define columns
  const columns = useMemo<ColumnDef<InventoryItem>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Part Name',
        cell: ({ row }) => (
          <EditableCell
            value={row.original.name}
            onSave={(value) => handleSave(row.original.id, 'name', value)}
            type="text"
            className="min-w-[150px]"
          />
        ),
      },
      {
        accessorKey: 'part_number',
        header: 'Part Number',
        cell: ({ row }) => (
          <EditableCell
            value={row.original.part_number}
            onSave={(value) => handleSave(row.original.id, 'part_number', value)}
            type="text"
            className="min-w-[120px]"
          />
        ),
      },
      {
        accessorKey: 'quantity',
        header: 'Quantity',
        cell: ({ row }) => (
          <EditableCell
            value={row.original.quantity}
            onSave={(value) => handleSave(row.original.id, 'quantity', value)}
            type="number"
            className="w-24"
          />
        ),
      },
      {
        accessorKey: 'reorder_threshold',
        header: 'Reorder Threshold',
        cell: ({ row }) => (
          <EditableCell
            value={row.original.reorder_threshold}
            onSave={(value) => handleSave(row.original.id, 'reorder_threshold', value)}
            type="number"
            className="w-24"
          />
        ),
      },
      {
        accessorKey: 'garage',
        header: 'Garage',
        cell: ({ row }) => {
          const garageOptions = garages.map((g) => ({ value: g.id, label: g.name }))
          return (
            <EditableCell
              value={row.original.garage_id}
              onSave={(value) => handleSave(row.original.id, 'garage_id', value)}
              type="select"
              options={garageOptions}
              className="min-w-[120px]"
            />
          )
        },
      },
      {
        accessorKey: 'updated_at',
        header: 'Last Updated',
        cell: ({ row }) => (
          <span className="text-sm text-textMuted whitespace-nowrap">
            {new Date(row.original.updated_at).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <button
            onClick={() => handleDelete(row.original.id)}
            className="p-1 text-statusRed hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        ),
      },
    ],
    [garages, handleSave, handleDelete]
  )

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  if (loading) {
    return (
      <div className="text-center py-12 text-textMuted">
        <p>Loading inventory...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        <p className="font-semibold">Error loading inventory</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={handleAdd}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2"
        >
          <span>+</span>
          <span>Add Part</span>
        </button>
      </div>

      <div className="overflow-x-auto border border-borderLight rounded-lg">
        <table className="min-w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-[#F9FBFF] border-b border-borderLight">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-borderLight">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-textMuted"
                >
                  No inventory items found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  data-row-id={row.original.id}
                  className={`hover:bg-slate-50 transition-colors ${
                    row.original.quantity <= row.original.reorder_threshold
                      ? 'bg-red-50'
                      : ''
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

