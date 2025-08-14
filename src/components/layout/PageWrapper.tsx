import { ReactNode } from 'react'

interface PageWrapperProps {
  children: ReactNode
  className?: string
}

export function PageWrapper({ children, className = '' }: PageWrapperProps) {
  return (
    <div className={`page-enter min-h-[calc(100vh-4rem)] w-full max-w-full overflow-x-hidden ${className}`}>
      <div className="stagger-children space-y-3 sm:space-y-4 lg:space-y-6 w-full max-w-full">
        {children}
      </div>
    </div>
  )
}