/**
 * QR Code Generation Script
 * 
 * This script generates QR codes for all buses in the fleet.
 * Each QR code encodes a URL that mechanics can scan to quickly log issues.
 * 
 * Usage:
 * 1. Install dependencies: npm install qrcode @types/qrcode
 * 2. Run: npx tsx scripts/generate-qr-codes.ts
 * 
 * The QR codes will be saved to the qr-codes/ directory.
 */

import QRCode from 'qrcode'
import { prisma } from '../lib/prisma'
import * as fs from 'fs'
import * as path from 'path'

async function generateQRCodes() {
  try {
    const buses = await prisma.bus.findMany({
      orderBy: {
        fleetNumber: 'asc',
      },
    })

    // Create qr-codes directory if it doesn't exist
    const qrCodesDir = path.join(process.cwd(), 'qr-codes')
    if (!fs.existsSync(qrCodesDir)) {
      fs.mkdirSync(qrCodesDir, { recursive: true })
    }

    // Base URL - update this to your production URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    console.log(`Generating QR codes for ${buses.length} buses...`)

    for (const bus of buses) {
      const url = `${baseUrl}/bus/${bus.fleetNumber}/log-issue`
      const filePath = path.join(qrCodesDir, `${bus.fleetNumber}.png`)

      await QRCode.toFile(filePath, url, {
        errorCorrectionLevel: 'M',
        type: 'png',
        width: 300,
        margin: 1,
      })

      console.log(`✓ Generated QR code for ${bus.fleetNumber}`)
    }

    console.log(`\n✅ Successfully generated ${buses.length} QR codes in ${qrCodesDir}`)
    console.log('Print these QR codes and attach them to the corresponding buses.')
  } catch (error) {
    console.error('Error generating QR codes:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Only run if executed directly
if (require.main === module) {
  generateQRCodes()
}

export { generateQRCodes }

