
import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { NavLink } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { SyncSubscriptionButton } from '@/components/profile/SyncSubscriptionButton'

interface UserProfile {
  nome: string
  phone: string
  avatar_url?: string
  email?: string
}

interface SubscriptionStatus {
  status: string
  plan_name?: string
}

export function UserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      console.log('[UserProfile] User authenticated, fetching profile data');
      fetchProfile();
      
      // Carregar status de assinatura com delay para não bloquear
      setTimeout(() => {
        console.log('[UserProfile] Starting background subscription fetch');
        fetchSubscriptionStatus();
      }, 500);
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      console.log('[UserProfile] Fetching profile for user:', user?.id);
      
      // Timeout de 3 segundos para não travar a UI
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: profile fetch took too long')), 3000)
      );

      const fetchPromise = supabase
        .from('profiles')
        .select('nome, phone, avatar_url, email')
        .eq('id', user?.id)
        .single();

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (error && !error.message?.includes('Timeout')) {
        console.log('[UserProfile] Profile not found or error, using fallback:', error);
        setProfile({
          nome: user?.email?.split('@')[0] || 'Usuário',
          phone: '',
          email: user?.email
        });
      } else if (data) {
        console.log('[UserProfile] Profile loaded:', data);
        setProfile(data);
      }
    } catch (error: any) {
      console.log('[UserProfile] Error loading profile:', error.message);
      setProfile({
        nome: user?.email?.split('@')[0] || 'Usuário',
        phone: '',
        email: user?.email
      });
    } finally {
      // Definir loading como false após carregar profile (não esperar subscription)
      setLoading(false);
    }
  }

  const fetchSubscriptionStatus = async () => {
    try {
      console.log('[UserProfile] Fetching subscription status for user:', user?.id);
      
      // Timeout de 3 segundos para não travar a UI
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: subscription fetch took too long')), 3000)
      );

      const fetchPromise = supabase
        .from('subscriptions')
        .select('status, plan_name')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (!error && data) {
        console.log('[UserProfile] Subscription status loaded:', data);
        setSubscriptionStatus(data);
      } else if (error && !error.message?.includes('Timeout')) {
        console.log('[UserProfile] No subscription found, checking profile for assinaturaid');
        
        // Se não encontrou subscription, verificar se tem assinaturaid no profile
        await checkProfileForSubscription();
      }
    } catch (error: any) {
      console.log('[UserProfile] Error loading subscription status:', error.message);
      if (error.message?.includes('Timeout')) {
        console.log('[UserProfile] Timeout detected, checking profile backup');
        await checkProfileForSubscription();
      }
    }
  }

  const checkProfileForSubscription = async () => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('assinaturaid')
        .eq('id', user?.id)
        .single();

      if (!error && profileData?.assinaturaid) {
        const assinaturaid = profileData.assinaturaid;
        console.log('[UserProfile] Found assinaturaid in profile:', assinaturaid);
        
        // Verificar se é Perfect Pay
        const isPerfectPay = assinaturaid === 'active' || 
                            assinaturaid.startsWith('pp_') || 
                            assinaturaid.startsWith('PPSUB');
        
        if (isPerfectPay) {
          console.log('[UserProfile] Perfect Pay detected, setting active status');
          setSubscriptionStatus({ 
            status: 'active', 
            plan_name: 'Perfect Pay - Plano Anual' 
          });
          
          // Tentar sincronizar em background
          tryAutoSync();
        } else if (assinaturaid !== 'inactive' && assinaturaid !== 'no-subscription') {
          console.log('[UserProfile] Valid subscription ID found, assuming active');
          setSubscriptionStatus({ 
            status: 'active', 
            plan_name: 'Plano Anual' 
          });
          
          // Tentar sincronizar em background
          tryAutoSync();
        }
      }
    } catch (error: any) {
      console.log('[UserProfile] Error checking profile:', error.message);
    }
  }

  const tryAutoSync = async () => {
    try {
      console.log('[UserProfile] Attempting auto-sync in background');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        await supabase.functions.invoke('sync-subscription', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        console.log('[UserProfile] Auto-sync completed');
        
        // Recarregar status após sync
        setTimeout(() => {
          fetchSubscriptionStatus();
        }, 1000);
      }
    } catch (error: any) {
      console.log('[UserProfile] Auto-sync failed:', error.message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <div className="animate-pulse">
          <div className="h-10 w-10 bg-muted rounded-full"></div>
        </div>
        <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
          <div className="h-4 bg-muted rounded animate-pulse mb-1"></div>
          <div className="h-3 bg-muted rounded animate-pulse w-3/4"></div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <NavLink to="/perfil" className="block">
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user?.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-medium truncate">{user?.email}</p>
            <p className="text-xs text-muted-foreground truncate">Configurar perfil</p>
          </div>
        </div>
      </NavLink>
    )
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const isActiveSubscription = subscriptionStatus?.status === 'active'

  return (
    <NavLink to="/perfil" className="block">
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(profile.nome)}
            </AvatarFallback>
          </Avatar>
          {isActiveSubscription && (
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{profile.nome}</p>
            {isActiveSubscription && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                Ativo
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground truncate">
              {subscriptionStatus?.plan_name || profile.phone || profile.email || 'Completar perfil'}
            </p>
            {!isActiveSubscription && <SyncSubscriptionButton />}
          </div>
        </div>
      </div>
    </NavLink>
  )
}
