'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { Card } from './Card'

interface Bus {
  fleet_number: string
}

interface BusQRCodeManagerProps {
  buses: Bus[]
}

export function BusQRCodeManager({ buses: initialBuses }: BusQRCodeManagerProps) {
  const [buses, setBuses] = useState<Bus[]>(initialBuses || [])
  const [selectedFleetNumber, setSelectedFleetNumber] = useState<string>('')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [newBusFleetNumber, setNewBusFleetNumber] = useState('')
  const [localIP, setLocalIP] = useState<string>('')
  const [showIPHelp, setShowIPHelp] = useState(false)
  const [loadingBuses, setLoadingBuses] = useState(false)

  // Fetch buses on client side if not provided or empty
  useEffect(() => {
    const fetchBuses = async () => {
      if (buses.length === 0) {
        setLoadingBuses(true)
        try {
          const response = await fetch('/api/buses')
          if (response.ok) {
            const data = await response.json()
            const formattedBuses = data.map((bus: any) => ({
              fleet_number: bus.fleet_number || bus.fleetNumber || ''
            })).filter((bus: Bus) => bus.fleet_number)
            setBuses(formattedBuses)
            console.log('BusQRCodeManager - Fetched buses:', formattedBuses.length)
          } else {
            console.error('Failed to fetch buses:', response.statusText)
          }
        } catch (error) {
          console.error('Error fetching buses:', error)
        } finally {
          setLoadingBuses(false)
        }
      } else {
        console.log('BusQRCodeManager - Using initial buses:', buses.length)
      }
    }

    fetchBuses()
  }, []) // Only run once on mount

  // Load saved IP from localStorage
  useEffect(() => {
    const savedIP = localStorage.getItem('local-network-ip')
    if (savedIP) {
      setLocalIP(savedIP)
    } else {
      // Try to detect if we're on localhost and suggest finding IP
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        setShowIPHelp(true)
      }
    }
  }, [])

  const saveIP = () => {
    if (localIP) {
      localStorage.setItem('local-network-ip', localIP)
      setShowIPHelp(false)
    }
  }

  const getBaseUrl = () => {
    // If we have a saved local IP and we're on localhost, use the IP
    if (localIP && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return `http://${localIP}:${window.location.port || 3000}`
    }
    // Otherwise use the current origin (works for production or if already on network IP)
    return window.location.origin
  }

  const generateQRCode = async (fleetNumber: string) => {
    if (!fleetNumber) {
      alert('Please enter or select a fleet number')
      return
    }

    // Check if we need an IP address
    if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && !localIP) {
      alert('Please enter your local network IP address first (see instructions below)')
      setShowIPHelp(true)
      return
    }

    setLoading(true)
    try {
      const baseUrl = getBaseUrl()
      const url = `${baseUrl}/bus/${fleetNumber}/quick-log`
      
      const dataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 400,
        margin: 2,
      })
      
      setQrDataUrl(dataUrl)
      setSelectedFleetNumber(fleetNumber)
    } catch (error) {
      console.error('Failed to generate QR code:', error)
      alert('Failed to generate QR code')
    } finally {
      setLoading(false)
    }
  }

  const downloadQRCode = () => {
    if (!qrDataUrl || !selectedFleetNumber) return
    
    const link = document.createElement('a')
    link.download = `QR-Bus-${selectedFleetNumber}.png`
    link.href = qrDataUrl
    link.click()
  }

  return (
    <div className="space-y-6">
      {/* Network IP Configuration */}
      {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-textMain mb-2">Local Network IP Address</h3>
            <p className="text-xs text-textMuted mb-3">
              To access from your phone, enter your computer's local network IP address.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={localIP}
                onChange={(e) => setLocalIP(e.target.value)}
                placeholder="e.g., 192.168.1.100"
                className="flex-1 border border-borderLight rounded-lg px-3 py-2 text-sm bg-white text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={saveIP}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium whitespace-nowrap"
              >
                Save IP
              </button>
            </div>
          </div>
          
          {showIPHelp && (
            <div className="bg-white rounded-lg p-3 border border-blue-300">
              <p className="text-xs font-semibold text-textMain mb-2">How to find your IP address:</p>
              <ul className="text-xs text-textMuted space-y-1 list-disc list-inside">
                <li><strong>Windows:</strong> Open Command Prompt, type <code className="bg-gray-100 px-1 rounded">ipconfig</code>, look for "IPv4 Address"</li>
                <li><strong>Mac:</strong> System Settings → Network → Wi-Fi/Ethernet → Details → IP Address</li>
                <li><strong>Linux:</strong> Run <code className="bg-gray-100 px-1 rounded">ip addr</code> or <code className="bg-gray-100 px-1 rounded">ifconfig</code></li>
              </ul>
              <p className="text-xs text-textMuted mt-2">
                <strong>Important:</strong> Make sure your phone and computer are on the same Wi-Fi network!
              </p>
            </div>
          )}
        </div>
      )}

      {/* New Bus QR Code Generation */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-textMain mb-2">Generate QR Code for New Bus</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newBusFleetNumber}
              onChange={(e) => setNewBusFleetNumber(e.target.value.toUpperCase())}
              placeholder="Enter fleet number (e.g., BUS-001)"
              className="flex-1 border border-borderLight rounded-lg px-3 py-2 text-sm bg-white text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={() => {
                if (newBusFleetNumber) {
                  generateQRCode(newBusFleetNumber)
                }
              }}
              disabled={loading || !newBusFleetNumber}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? 'Generating...' : 'Generate QR Code'}
            </button>
          </div>
        </div>
      </div>

      {/* Existing Bus Selection */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-textMain">Or Select Existing Bus</h3>
            {buses && buses.length > 0 && (
              <span className="text-xs text-textMuted">
                {buses.length} bus{buses.length !== 1 ? 'es' : ''} available
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <select
              value={selectedFleetNumber}
              onChange={(e) => setSelectedFleetNumber(e.target.value)}
              disabled={loadingBuses}
              className="flex-1 border border-borderLight rounded-lg px-3 py-2 text-sm bg-white text-textMain focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {loadingBuses ? 'Loading buses...' : 'Select a bus...'}
              </option>
              {buses && buses.length > 0 ? (
                buses.map((bus) => {
                  const fleetNumber = bus.fleet_number || bus.fleetNumber || ''
                  return (
                    <option key={fleetNumber} value={fleetNumber}>
                      {fleetNumber}
                    </option>
                  )
                })
              ) : !loadingBuses ? (
                <option value="" disabled>No buses available</option>
              ) : null}
            </select>
            <button
              onClick={() => generateQRCode(selectedFleetNumber)}
              disabled={loading || !selectedFleetNumber}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? 'Generating...' : 'Generate QR Code'}
            </button>
          </div>
        </div>
      </div>

      {/* QR Code Display */}
      {qrDataUrl && (
        <div className="space-y-3 pt-4 border-t border-borderLight">
          <div className="flex justify-center p-6 bg-white rounded-lg border border-borderLight">
            <img src={qrDataUrl} alt={`QR Code for Bus ${selectedFleetNumber}`} className="max-w-full" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm text-textMuted">Bus: {selectedFleetNumber}</p>
            <p className="text-xs text-textMuted">URL: {getBaseUrl()}/bus/{selectedFleetNumber}/quick-log</p>
            <button
              onClick={downloadQRCode}
              className="bg-gray-100 text-textMain px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Download QR Code
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
