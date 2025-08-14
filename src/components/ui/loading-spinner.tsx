import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

export function LoadingSpinner({ className, size = "md" }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  }

  return (
    <div className="flex items-center justify-center min-h-[200px] w-full">
      <div className="flex flex-col items-center gap-3">
        <div 
          className={cn(
            "animate-spin rounded-full border-2 border-primary border-t-transparent",
            sizeClasses[size],
            className
          )}
        />
        <p className="text-sm text-muted-foreground animate-pulse">Carregando...</p>
      </div>
    </div>
  )
}