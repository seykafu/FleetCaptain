'use client'

import { useState, useEffect } from 'react'
import { Card } from './Card'

interface Bus {
  fleet_number: string
  id: string
}

interface FollowedBus {
  bus_id: string
  fleet_number: string
}

export function BusFollowManager() {
  const [buses, setBuses] = useState<Bus[]>([])
  const [followedBuses, setFollowedBuses] = useState<FollowedBus[]>([])
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch all buses
      const busesResponse = await fetch('/api/buses')
      if (busesResponse.ok) {
        const busesData = await busesResponse.json()
        // Transform to include id
        const transformedBuses = busesData.map((bus: any) => ({
          id: bus.id || bus.fleet_number, // Use id if available, otherwise use fleet_number as fallback
          fleet_number: bus.fleet_number,
        }))
        setBuses(transformedBuses)
      }

      // For now, we'll need to get the current user ID
      // In production, this would come from authentication
      // For MVP, we'll use the first maintenance user or allow selection
      const usersResponse = await fetch('/api/maintenance-users')
      if (usersResponse.ok) {
        const users = await usersResponse.json()
        if (users.length > 0) {
          const userId = users[0].id // Use first user for now
          const followsResponse = await fetch(`/api/bus-follows?user_id=${userId}`)
          if (followsResponse.ok) {
            const followsData = await followsResponse.json()
            setFollowedBuses(followsData)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCurrentUserId = async (): Promise<string | null> => {
    try {
      const usersResponse = await fetch('/api/maintenance-users')
      if (usersResponse.ok) {
        const users = await usersResponse.json()
        return users.length > 0 ? users[0].id : null
      }
    } catch (error) {
      console.error('Failed to get current user:', error)
    }
    return null
  }

  const handleFollow = async (busId: string) => {
    setFollowing(busId)
    try {
      const userId = await getCurrentUserId()
      if (!userId) {
        alert('Please ensure at least one maintenance user exists')
        return
      }

      const response = await fetch('/api/bus-follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bus_id: busId, user_id: userId }),
      })

      if (response.ok) {
        await fetchData() // Refresh the list
      } else {
        const error = await response.json()
        alert(`Failed to follow bus: ${error.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to follow bus:', error)
      alert('Failed to follow bus. Please try again.')
    } finally {
      setFollowing(null)
    }
  }

  const handleUnfollow = async (busId: string) => {
    if (!confirm('Stop following this bus? You will no longer receive SMS notifications for it.')) {
      return
    }

    setFollowing(busId)
    try {
      const userId = await getCurrentUserId()
      if (!userId) {
        alert('Please ensure at least one maintenance user exists')
        return
      }

      const response = await fetch(`/api/bus-follows/${busId}?user_id=${userId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchData() // Refresh the list
      } else {
        const error = await response.json()
        alert(`Failed to unfollow bus: ${error.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to unfollow bus:', error)
      alert('Failed to unfollow bus. Please try again.')
    } finally {
      setFollowing(null)
    }
  }

  const followedBusIds = new Set(followedBuses.map((fb) => fb.bus_id))

  if (loading) {
    return (
      <Card title="Follow Buses" subtitle="Get SMS notifications when buses you follow receive updates">
        <p className="text-sm text-textMuted">Loading...</p>
      </Card>
    )
  }

  return (
    <Card
      title="Follow Buses"
      subtitle="Get SMS notifications when buses you follow receive maintenance updates"
    >
      <div className="space-y-4">
        {followedBuses.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-textMain mb-2">Currently Following</h4>
            <div className="space-y-2">
              {followedBuses.map((fb) => (
                <div
                  key={fb.bus_id}
                  className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3"
                >
                  <span className="text-sm font-medium text-textMain">Bus {fb.fleet_number}</span>
                  <button
                    onClick={() => handleUnfollow(fb.bus_id)}
                    disabled={following === fb.bus_id}
                    className="text-xs text-statusRed hover:text-statusRed/80 font-medium disabled:opacity-50"
                  >
                    {following === fb.bus_id ? 'Unfollowing...' : 'Unfollow'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold text-textMain mb-2">All Buses</h4>
          <div className="max-h-96 overflow-y-auto border border-borderLight rounded-lg">
            <table className="min-w-full">
              <thead className="bg-[#F9FBFF] border-b border-borderLight sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                    Fleet Number
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-textMuted uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderLight">
                {buses.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-textMuted">
                      No buses found
                    </td>
                  </tr>
                ) : (
                  buses.map((bus) => {
                    const isFollowing = followedBusIds.has(bus.id)
                    return (
                      <tr key={bus.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2 text-sm font-medium text-textMain">
                          {bus.fleet_number}
                        </td>
                        <td className="px-4 py-2 text-sm text-textMuted">
                          {isFollowing ? (
                            <span className="text-statusGreen text-xs font-medium">Following</span>
                          ) : (
                            <span className="text-textMuted text-xs">Not following</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {isFollowing ? (
                            <button
                              onClick={() => handleUnfollow(bus.id)}
                              disabled={following === bus.id}
                              className="text-xs text-statusRed hover:text-statusRed/80 font-medium disabled:opacity-50"
                            >
                              {following === bus.id ? 'Unfollowing...' : 'Unfollow'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleFollow(bus.id)}
                              disabled={following === bus.id}
                              className="text-xs text-primary hover:text-primary/80 font-medium disabled:opacity-50"
                            >
                              {following === bus.id ? 'Following...' : 'Follow'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
          <p className="font-semibold mb-1">How it works:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>When you log maintenance on a bus, you automatically start following it</li>
            <li>You&apos;ll receive SMS notifications when anyone updates that bus</li>
            <li>Make sure your phone number is set in the Phone Number Settings above</li>
          </ul>
        </div>
      </div>
    </Card>
  )
}

