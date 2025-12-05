'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from './Card'

interface MaintenanceUser {
  id: string
  name: string
  phone: string | null
}

export function PhoneNumberSettings() {
  const [users, setUsers] = useState<MaintenanceUser[]>([])
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [phoneValue, setPhoneValue] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPhone, setNewUserPhone] = useState('')
  const [addingUser, setAddingUser] = useState(false)
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/maintenance-users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (user: MaintenanceUser) => {
    setEditingUserId(user.id)
    setPhoneValue(user.phone || '')
    // Focus the input after state update
    setTimeout(() => {
      const input = inputRefs.current[user.id]
      if (input) {
        input.focus()
        input.select()
      }
    }, 0)
  }

  const handleSave = async (userId: string, value: string) => {
    setSaving(userId)
    const trimmedValue = value.trim()
    
    try {
      const response = await fetch(`/api/maintenance-users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: trimmedValue || null }),
      })

      if (response.ok) {
        const updated = await response.json()
        setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)))
        setEditingUserId(null)
        setPhoneValue('')
      } else {
        const error = await response.json()
        alert(`Failed to save: ${error.message || 'Unknown error'}`)
        // Revert to original value on error
        const originalUser = users.find(u => u.id === userId)
        if (originalUser) {
          setPhoneValue(originalUser.phone || '')
        }
      }
    } catch (error) {
      console.error('Failed to save phone number:', error)
      alert('Failed to save phone number. Please try again.')
      // Revert to original value on error
      const originalUser = users.find(u => u.id === userId)
      if (originalUser) {
        setPhoneValue(originalUser.phone || '')
      }
    } finally {
      setSaving(null)
    }
  }

  const handleCancel = (userId: string) => {
    const originalUser = users.find(u => u.id === userId)
    if (originalUser) {
      setPhoneValue(originalUser.phone || '')
    }
    setEditingUserId(null)
  }

  const handleAddUser = async () => {
    if (!newUserName.trim()) {
      alert('Please enter a name')
      return
    }

    setAddingUser(true)
    try {
      const response = await fetch('/api/maintenance-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim() || null,
          phone: newUserPhone.trim() || null,
        }),
      })

      if (response.ok) {
        const newUser = await response.json()
        setUsers((prev) => [...prev, newUser].sort((a, b) => a.name.localeCompare(b.name)))
        setNewUserName('')
        setNewUserEmail('')
        setNewUserPhone('')
        setShowAddUser(false)
      } else {
        const error = await response.json()
        alert(`Failed to add user: ${error.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to add user:', error)
      alert('Failed to add user. Please try again.')
    } finally {
      setAddingUser(false)
    }
  }

  if (loading) {
    return (
      <Card title="Phone Number Settings" subtitle="Manage phone numbers for SMS notifications">
        <p className="text-sm text-textMuted">Loading...</p>
      </Card>
    )
  }

  return (
    <Card
      title="Phone Number Settings"
      subtitle="Add phone numbers to receive SMS notifications for buses you follow"
    >
      <div className="space-y-4">
        {/* Add User Section */}
        <div className="flex justify-between items-center">
          <div></div>
          {!showAddUser ? (
            <button
              onClick={() => setShowAddUser(true)}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              + Add User
            </button>
          ) : (
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Name (required)"
                className="border border-borderLight rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newUserName.trim()) {
                    handleAddUser()
                  }
                  if (e.key === 'Escape') {
                    setShowAddUser(false)
                    setNewUserName('')
                    setNewUserEmail('')
                    setNewUserPhone('')
                  }
                }}
                autoFocus
              />
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="Email (optional)"
                className="border border-borderLight rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="tel"
                value={newUserPhone}
                onChange={(e) => setNewUserPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="border border-borderLight rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleAddUser}
                disabled={addingUser || !newUserName.trim()}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingUser ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={() => {
                  setShowAddUser(false)
                  setNewUserName('')
                  setNewUserEmail('')
                  setNewUserPhone('')
                }}
                className="bg-gray-100 text-textMain px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {users.length === 0 ? (
          <p className="text-sm text-textMuted">No maintenance users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-[#F9FBFF] border-b border-borderLight">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                    Phone Number
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderLight">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-textMain">{user.name}</td>
                    <td className="px-4 py-3 text-sm text-textMuted">
                      {editingUserId === user.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            ref={(el) => { inputRefs.current[user.id] = el }}
                            type="tel"
                            value={phoneValue}
                            onChange={(e) => setPhoneValue(e.target.value)}
                            placeholder="+1234567890"
                            className="border border-primary rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-48"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSave(user.id, phoneValue)
                              }
                              if (e.key === 'Escape') {
                                handleCancel(user.id)
                              }
                            }}
                            onBlur={() => {
                              // Save on blur if value changed
                              const originalValue = user.phone || ''
                              if (phoneValue.trim() !== originalValue) {
                                handleSave(user.id, phoneValue)
                              } else {
                                handleCancel(user.id)
                              }
                            }}
                          />
                          {saving === user.id && (
                            <span className="text-xs text-textMuted">Saving...</span>
                          )}
                        </div>
                      ) : (
                        <div
                          onClick={() => handleEdit(user)}
                          className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors inline-block min-w-[120px]"
                        >
                          {user.phone || <span className="text-textMuted italic">Click to add</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
          <p className="font-semibold mb-1">Note:</p>
          <p>
            Phone numbers should be in E.164 format (e.g., +1234567890). When you log maintenance on a bus,
            you&apos;ll automatically follow that bus and receive SMS notifications for future updates.
          </p>
        </div>
      </div>
    </Card>
  )
}

