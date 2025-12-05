'use client'

import { useState } from 'react'
import QRCode from 'qrcode'
import { supabase } from '@/lib/supabase'

interface QRCodeGeneratorProps {
  fleetNumber: string
}

export function QRCodeGenerator({ fleetNumber }: QRCodeGeneratorProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const generateQRCode = async () => {
    setLoading(true)
    try {
      const baseUrl = window.location.origin
      const url = `${baseUrl}/bus/${fleetNumber}/quick-log`
      
      const dataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
        margin: 1,
      })
      
      setQrDataUrl(dataUrl)
    } catch (error) {
      console.error('Failed to generate QR code:', error)
      alert('Failed to generate QR code')
    } finally {
      setLoading(false)
    }
  }

  const downloadQRCode = () => {
    if (!qrDataUrl) return
    
    const link = document.createElement('a')
    link.download = `QR-${fleetNumber}.png`
    link.href = qrDataUrl
    link.click()
  }

  return (
    <div className="space-y-4">
      <button
        onClick={generateQRCode}
        disabled={loading}
        className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Generating...' : 'Generate QR Code'}
      </button>
      
      {qrDataUrl && (
        <div className="space-y-3">
          <div className="flex justify-center p-4 bg-white rounded-lg border border-borderLight">
            <img src={qrDataUrl} alt={`QR Code for Bus ${fleetNumber}`} className="max-w-full" />
          </div>
          <button
            onClick={downloadQRCode}
            className="w-full bg-gray-100 text-textMain px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            Download QR Code
          </button>
        </div>
      )}
    </div>
  )
}

