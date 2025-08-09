import React from 'react'
import { cn } from '@/lib/utils'

interface MobileLoadingProps {
  className?: string
  type?: 'spinner' | 'skeleton' | 'pulse'
  size?: 'sm' | 'md' | 'lg'
  fullScreen?: boolean
}

export const MobileLoading: React.FC<MobileLoadingProps> = ({
  className,
  type = 'skeleton',
  size = 'md',
  fullScreen = false
}) => {
  const sizeClasses = {
    sm: 'h-4',
    md: 'h-8',
    lg: 'h-12'
  }

  if (type === 'spinner') {
    return (
      <div className={cn(
        'flex items-center justify-center',
        fullScreen && 'min-h-screen',
        className
      )}>
        <div className={cn(
          'animate-spin rounded-full border-b-2 border-primary',
          sizeClasses[size],
          size === 'sm' && 'w-4',
          size === 'md' && 'w-8',
          size === 'lg' && 'w-12'
        )} />
      </div>
    )
  }

  if (type === 'pulse') {
    return (
      <div className={cn(
        'animate-pulse space-y-4',
        fullScreen && 'min-h-screen p-4',
        className
      )}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  // Default skeleton
  return (
    <div className={cn(
      'animate-pulse space-y-3',
      fullScreen && 'min-h-screen p-4',
      className
    )}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="glass-card p-4 space-y-3">
            <div className="h-6 bg-gradient-to-r from-muted via-muted/50 to-muted rounded animate-shimmer" />
            <div className="h-4 bg-gradient-to-r from-muted via-muted/50 to-muted rounded animate-shimmer w-2/3" />
            <div className="h-4 bg-gradient-to-r from-muted via-muted/50 to-muted rounded animate-shimmer w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-in">
      {children}
    </div>
  )
}