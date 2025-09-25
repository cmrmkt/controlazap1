import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ProtectedVideoProps {
  src: string;
  poster?: string;
  className?: string;
  autoplay?: boolean;
  muted?: boolean;
}

export function ProtectedVideo({
  src,
  poster,
  className,
  autoplay = true,
  muted = true
}: ProtectedVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Disable right-click context menu
    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Disable keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+S, Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.key === 's') ||
        (e.ctrlKey && e.key === 'u')
      ) {
        e.preventDefault();
        return false;
      }
    };

    // Disable drag and drop
    const handleDragStart = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Add event listeners
    video.addEventListener('contextmenu', handleContextMenu);
    video.addEventListener('dragstart', handleDragStart);
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      video.removeEventListener('contextmenu', handleContextMenu);
      video.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLoadedData = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError(true);
  };

  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center z-10">
          <p className="text-muted-foreground">Erro ao carregar vídeo</p>
        </div>
      )}

      {/* Protected Video Element */}
      <video
        ref={videoRef}
        className={cn(
          "w-full h-full object-cover",
          "select-none pointer-events-auto",
          "focus:outline-none"
        )}
        poster={poster}
        autoPlay={autoplay}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
        onLoadedData={handleLoadedData}
        onError={handleError}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        draggable={false}
        style={{
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          userSelect: 'none',
          WebkitTouchCallout: 'none'
        }}
      >
        <source src={src} type="video/mp4" />
        Seu navegador não suporta vídeo HTML5.
      </video>

      {/* Invisible Session Watermark */}
      <div className="absolute top-2 right-2 opacity-0 pointer-events-none text-xs">
        {new Date().getTime()}
      </div>

      {/* Protection Overlay */}
      <div 
        className="absolute inset-0 bg-transparent pointer-events-none"
        style={{ zIndex: 1 }}
      />
    </div>
  );
}