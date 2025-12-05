'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

export function SuccessBanner() {
  const searchParams = useSearchParams()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setShow(true)
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => setShow(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  if (!show) return null

  return (
    <div className="bg-green-50 border-l-4 border-statusGreen p-4 mb-6 rounded-lg">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <CheckCircleIcon className="h-5 w-5 text-statusGreen" />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-statusGreen">
            Issue logged successfully!
          </p>
        </div>
        <div className="ml-auto pl-3">
          <button
            onClick={() => setShow(false)}
            className="text-statusGreen hover:text-statusGreen/80 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
