import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  title?: string
  subtitle?: string
  headerAction?: ReactNode
}

export function Card({ children, className = '', title, subtitle, headerAction }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-borderLight shadow-sm p-4 md:p-5 ${className}`}>
      {(title || subtitle || headerAction) && (
        <div className="mb-4 flex items-start justify-between">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-textMain mb-1">{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs text-textMuted">{subtitle}</p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

