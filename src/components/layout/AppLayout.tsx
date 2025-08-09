
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { useIsMobile } from '@/hooks/use-mobile'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useIsMobile()
  const { signOut } = useAuth()

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset>
          <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-card border-b shadow-sm sticky top-0 z-40">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold title-color hidden sm:block">
                  Gestão PoupeiZap
                </h1>
                <h1 className="text-base font-semibold title-color sm:hidden">
                  PoupeiZap
                </h1>
              </div>
            </div>
            
            {/* Mobile logout button - always visible on mobile */}
            {isMobile && (
              <Button
                onClick={signOut}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-xs">Sair</span>
              </Button>
            )}
          </header>
          <div className="flex-1 p-2 sm:p-6 bg-background transition-all duration-200 w-full min-w-0 overflow-x-hidden">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
