
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { useIsMobile } from '@/hooks/use-mobile'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { PaletteSwitcher } from '@/components/ui/palette-switcher'
import { LogOut } from 'lucide-react'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useIsMobile()
  const { signOut } = useAuth()

  return (
    <SidebarProvider>
      <div className="min-h-screen max-w-full flex w-full bg-background overflow-x-hidden">
        <AppSidebar />
        <SidebarInset className="flex-1 min-w-0">
          <header className="h-16 flex items-center justify-between px-3 sm:px-6 bg-card border-b shadow-sm sticky top-0 z-40 min-w-0">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <SidebarTrigger className="shrink-0" />
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 truncate">
                <img 
                  src="/lovable-uploads/a1905fc1-9bc7-4e86-9542-961da6ddf409.png" 
                  alt="ControlaZap Logo" 
                  className="h-8 sm:h-10 md:h-12 lg:h-14 w-auto object-contain max-w-full"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <PaletteSwitcher />
              
              {/* Mobile logout button - always visible on mobile */}
              {isMobile && (
                <Button
                  onClick={signOut}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 px-2 sm:px-3"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-xs hidden xs:inline">Sair</span>
                </Button>
              )}
            </div>
          </header>
          <main className="flex-1 p-2 sm:p-4 lg:p-6 bg-background min-w-0 max-w-full overflow-x-hidden">
            <div className="w-full max-w-full mx-auto">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
