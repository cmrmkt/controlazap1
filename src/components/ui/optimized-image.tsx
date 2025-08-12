import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  webp?: boolean
  lazy?: boolean
  skeleton?: boolean
  quality?: 'low' | 'medium' | 'high'
  sizes?: string
}

export const OptimizedImage = React.forwardRef<HTMLImageElement, OptimizedImageProps>(
  ({ 
    src, 
    alt, 
    className, 
    webp = true, 
    lazy = true, 
    skeleton = true,
    quality = 'medium',
    sizes,
    ...props 
  }, ref) => {
    const [isLoaded, setIsLoaded] = useState(false)
    const [isError, setIsError] = useState(false)
    const [isInView, setIsInView] = useState(!lazy)
    const imgRef = useRef<HTMLImageElement>(null)

    // Intersection Observer for lazy loading
    useEffect(() => {
      if (!lazy || isInView) return

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        },
        { 
          threshold: 0.1,
          rootMargin: '50px' // Start loading 50px before entering viewport
        }
      )

      if (imgRef.current) {
        observer.observe(imgRef.current)
      }

      return () => observer.disconnect()
    }, [lazy, isInView])

    // Use original source - no automatic WebP conversion
    const getOptimizedSrc = (originalSrc: string) => {
      return originalSrc
    }

    // Simplified - no custom srcSet generation
    const generateSrcSet = () => undefined

    const handleLoad = () => {
      setIsLoaded(true)
      setIsError(false)
    }

    const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      const img = e.currentTarget
      
      // Try fallback images in sequence
      if (!img.src.includes('fallback-1')) {
        img.src = '/lovable-uploads/311f462d-5f5c-47af-b777-59c52224035b.png?fallback-1'
        return
      }
      
      if (!img.src.includes('fallback-2')) {
        img.src = '/lovable-uploads/3e6efeb8-4963-4a6b-9548-e1ce00ab987b.png?fallback-2'
        return
      }
      
      // Final fallback - show error state
      setIsError(true)
      setIsLoaded(false)
    }

    const imageStyles = cn(
      'transition-opacity duration-300',
      isLoaded ? 'opacity-100' : 'opacity-0',
      className
    )

    const skeletonStyles = cn(
      'absolute inset-0 bg-gradient-to-r from-muted via-muted/50 to-muted animate-pulse rounded',
      isLoaded && 'opacity-0'
    )

    return (
      <div ref={imgRef} className="relative overflow-hidden">
        {/* Skeleton loader */}
        {skeleton && !isLoaded && !isError && (
          <div className={skeletonStyles} />
        )}

        {/* Actual image */}
        {isInView && (
          <img
            ref={ref}
            src={src}
            alt={alt}
            className={imageStyles}
            loading={lazy ? 'lazy' : 'eager'}
            decoding="async"
            onLoad={handleLoad}
            onError={handleError}
            {...props}
          />
        )}

        {/* Error state */}
        {isError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-sm font-medium">
            <div className="text-center">
              <div className="text-lg font-bold mb-2">ControlaZap</div>
              <div className="text-xs opacity-70">Imagem em carregamento...</div>
            </div>
          </div>
        )}
      </div>
    )
  }
)

OptimizedImage.displayName = 'OptimizedImage'