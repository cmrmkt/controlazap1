import React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

interface PageSkeletonProps {
  className?: string
  showHeader?: boolean
  showSidebar?: boolean
  cardCount?: number
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({
  className,
  showHeader = true,
  showSidebar = false,
  cardCount = 6
}) => {
  return (
    <div className={cn('animate-pulse space-y-6', className)}>
      {showHeader && (
        <div className="space-y-3">
          <div className="h-8 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-lg w-1/3 animate-shimmer" />
          <div className="h-4 bg-gradient-to-r from-muted via-muted/50 to-muted rounded w-1/2 animate-shimmer" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(cardCount)].map((_, i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-6 bg-gradient-to-r from-muted via-muted/50 to-muted rounded w-2/3 animate-shimmer" />
                <div className="h-8 w-8 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-full animate-shimmer" />
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gradient-to-r from-muted via-muted/50 to-muted rounded w-full animate-shimmer" />
                <div className="h-4 bg-gradient-to-r from-muted via-muted/50 to-muted rounded w-3/4 animate-shimmer" />
              </div>
              <div className="flex justify-between items-center">
                <div className="h-6 bg-gradient-to-r from-muted via-muted/50 to-muted rounded w-1/3 animate-shimmer" />
                <div className="h-8 bg-gradient-to-r from-muted via-muted/50 to-muted rounded w-20 animate-shimmer" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Export alias for backward compatibility
export const DashboardSkeleton = PageSkeleton