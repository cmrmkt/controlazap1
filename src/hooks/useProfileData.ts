import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'

interface ProfileData {
  id: string
  nome: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  avatar_url: string | null
  assinaturaid: string | null
  ativo: boolean | null
  subscription_status: string | null
  subscription_end_date: string | null
}

interface SubscriptionData {
  id: string
  user_id: string
  subscription_id: string
  status: 'active' | 'inactive' | 'cancelled' | 'suspended'
  plan_name: string | null
  amount: number | null
  currency: string | null
  cycle: string | null
  start_date: string | null
  next_payment_date: string | null
  payment_method: string | null
  card_last_four: string | null
  card_brand: string | null
  created_at: string
  updated_at: string
}

interface UseProfileDataReturn {
  profileData: ProfileData | null
  subscriptionData: SubscriptionData | null
  loading: boolean
  refreshData: () => Promise<void>
  syncSubscription: () => Promise<void>
}

export function useProfileData(): UseProfileDataReturn {
  const { user } = useAuth()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const loadData = async () => {
    if (!user?.id || !isMounted.current) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log('Loading profile and subscription data in parallel...')
      
      // Executar queries em paralelo para melhor performance
      const [profileResponse, subscriptionResponse] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      ])

      if (!isMounted.current) return

      // Processar perfil
      if (profileResponse.error) {
        console.error('Erro ao carregar perfil:', profileResponse.error)
      } else if (profileResponse.data) {
        setProfileData(profileResponse.data)
      }

      // Processar assinatura
      if (subscriptionResponse.error) {
        console.error('Erro ao carregar assinatura:', subscriptionResponse.error)
      } else if (subscriptionResponse.data) {
        const normalizedData: SubscriptionData = {
          ...subscriptionResponse.data,
          status: (subscriptionResponse.data.status as 'active' | 'inactive' | 'cancelled' | 'suspended') || 'inactive'
        }
        setSubscriptionData(normalizedData)
      }

      console.log('Profile and subscription data loaded successfully')
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error)
      if (isMounted.current) {
        toast({
          title: "Erro ao carregar dados",
          description: "Houve um problema ao carregar seus dados",
          variant: "destructive",
        })
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }

  const syncSubscription = async () => {
    if (!user?.id || !isMounted.current) return

    try {
      console.log('Sincronizando dados da assinatura...')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado')
      }

      const response = await supabase.functions.invoke('sync-subscription', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!isMounted.current) return

      if (response.error) {
        throw response.error
      }

      console.log('Sincronização concluída com sucesso:', response.data)

      // Recarregar dados após sincronização
      await loadData()

      toast({
        title: "Sucesso",
        description: response.data?.message || "Dados da assinatura atualizados com sucesso",
      })
    } catch (error: any) {
      console.error('Erro na sincronização:', error)
      if (isMounted.current) {
        toast({
          title: "Erro",
          description: error.message || "Ocorreu um erro durante a sincronização",
          variant: "destructive",
        })
      }
    }
  }

  useEffect(() => {
    if (user && isMounted.current) {
      console.log('User loaded, starting immediate data load...')
      loadData()
    }
  }, [user])

  return {
    profileData,
    subscriptionData,
    loading,
    refreshData: loadData,
    syncSubscription
  }
}