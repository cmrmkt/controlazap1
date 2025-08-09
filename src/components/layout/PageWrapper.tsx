import { ReactNode } from 'react'

interface PageWrapperProps {
  children: ReactNode
  className?: string
}

export function PageWrapper({ children, className = '' }: PageWrapperProps) {
  return (
    <div className={`page-enter min-h-screen w-full ${className}`}>
      <div className="stagger-children space-y-3 sm:space-y-6 w-full">
        {children}
      </div>
    </div>
  )
}