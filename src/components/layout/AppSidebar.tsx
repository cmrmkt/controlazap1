import { NavLink, useLocation } from 'react-router-dom'
import { Home, CreditCard, Calendar, User, LogOut, Tag, FileText, Menu, X, Users } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { UserProfile } from './UserProfile'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

// Função para fazer preload das rotas com performance otimizada
const preloadRoute = (routePath: string): void => {
  try {
    // Preload mais agressivo e otimizado
    const preloadPromises: Promise<any>[] = []
    
    switch (routePath) {
      case '/dashboard':
        preloadPromises.push(import('../../pages/Dashboard'))
        break
      case '/transacoes':
        preloadPromises.push(import('../../pages/Transacoes'))
        break
      case '/categorias':
        preloadPromises.push(import('../../pages/Categorias'))
        break
      case '/relatorios':
        preloadPromises.push(import('../../pages/Relatorios'))
        break
      case '/lembretes':
        preloadPromises.push(import('../../pages/Lembretes'))
        break
      case '/perfil':
        preloadPromises.push(import('../../pages/Perfil'))
        break
      case '/plano':
        preloadPromises.push(import('../../pages/Plano'))
        break
    }
    
    // Preload em paralelo para melhor performance
    Promise.allSettled(preloadPromises)
  } catch (error) {
    // Silent fail para não afetar UX
  }
}

// Menu items
const items = [
  { title: 'Dashboard', url: '/dashboard', icon: Home },
  { title: 'Transações', url: '/transacoes', icon: CreditCard },
  { title: 'Categorias', url: '/categorias', icon: Tag },
  { title: 'Relatórios', url: '/relatorios', icon: FileText },
  { title: 'Lembretes', url: '/lembretes', icon: Calendar },
  { title: 'Perfil', url: '/perfil', icon: User },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const { signOut } = useAuth()
  const location = useLocation()
  const currentPath = location.pathname
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const isActive = (path: string) => {
    return currentPath === path
  }
  const isCollapsed = state === "collapsed"

  // Preload inteligente baseado em hover
  useEffect(() => {
    // Preload crítico para páginas principais
    const criticalRoutes = ['/dashboard', '/perfil', '/transacoes']
    criticalRoutes.forEach(route => {
      const timeoutId = setTimeout(() => preloadRoute(route), 100)
      return () => clearTimeout(timeoutId)
    })
  }, [])

  return (
    <TooltipProvider>
      <Sidebar collapsible="icon" className="border-r transition-all duration-150 ease-out">
        <SidebarHeader className="border-b border-border/40">
          <div className="flex h-12 items-center px-4">
            <h2 className="text-lg font-semibold text-foreground">Menu</h2>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navegação</SidebarGroupLabel>
            <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = isActive(item.url)
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all duration-150 ease-out hover:bg-accent hover:text-accent-foreground will-change-transform ${
                          active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
                        }`}
                        onMouseEnter={() => {
                          setHoveredItem(item.url)
                          preloadRoute(item.url)
                        }}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className={`transition-all duration-150 ease-out ${
                          hoveredItem === item.url ? 'translate-x-1' : ''
                        }`}>
                          {item.title}
                        </span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

      <SidebarFooter className="border-t border-border/40">
        <div className="p-4 space-y-4">
          <UserProfile />
          
          <Button
            onClick={signOut}
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150 ease-out"
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && "Sair"}
          </Button>
        </div>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
    </TooltipProvider>
  )
}