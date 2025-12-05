'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'

interface EditableCellProps {
  value: string | number
  onSave: (value: string | number) => Promise<void>
  type?: 'text' | 'number' | 'select'
  options?: Array<{ value: string; label: string }>
  className?: string
  disabled?: boolean
}

export function EditableCell({
  value,
  onSave,
  type = 'text',
  options = [],
  className = '',
  disabled = false,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(String(value))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)

  useEffect(() => {
    setEditValue(String(value))
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      if (type === 'text' && inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select()
      }
    }
  }, [isEditing, type])

  const handleSave = async () => {
    if (disabled || isSaving) return

    // Validation
    if (type === 'number') {
      const numValue = Number(editValue)
      if (isNaN(numValue) || numValue < 0) {
        setError('Must be a number ≥ 0')
        return
      }
      if (editValue.trim() === '') {
        setError('Cannot be empty')
        return
      }
    }

    if (type === 'text' && editValue.trim() === '') {
      setError('Cannot be empty')
      return
    }

    setError(null)
    setIsSaving(true)

    try {
      const saveValue = type === 'number' ? Number(editValue) : editValue.trim()
      await onSave(saveValue)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(String(value))
    setError(null)
    setIsEditing(false)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  const handleClick = () => {
    if (!disabled && !isEditing) {
      setIsEditing(true)
    }
  }

  // Get display value - for select, show the label instead of value
  const displayValue = type === 'select' && options.length > 0
    ? options.find(opt => opt.value === String(value))?.label || value
    : value

  if (disabled) {
    return <span className={className}>{displayValue}</span>
  }

  if (!isEditing) {
    return (
      <div
        onClick={handleClick}
        data-editable="true"
        className={`cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors ${className}`}
      >
        {displayValue}
      </div>
    )
  }

  return (
    <div className="relative">
      {type === 'select' ? (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={`border border-primary rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
          disabled={isSaving}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={`border border-primary rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
          disabled={isSaving}
          min={type === 'number' ? 0 : undefined}
        />
      )}
      {isSaving && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-textMuted">
          Saving...
        </span>
      )}
      {error && (
        <div className="absolute left-0 top-full mt-1 text-xs text-statusRed bg-red-50 px-2 py-1 rounded border border-red-200 z-10">
          {error}
        </div>
      )}
    </div>
  )
}

