
import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'
import { CreditCard, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { SubscriptionDetails } from './SubscriptionDetails'
import { PaymentMethod } from './PaymentMethod'
import { SubscriptionStatusBadge } from './SubscriptionStatusBadge'
import { useAutoSubscriptionValidation } from '@/hooks/useAutoSubscriptionValidation'

import type { SubscriptionData } from '@/types/subscription'

export function SubscriptionInfo() {
  const { user } = useAuth()
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const isMounted = useRef(true)

  // Auto subscription validation hook
  useAutoSubscriptionValidation({
    onValidationComplete: (hasActiveSubscription) => {
      if (isMounted.current) {
        console.log('Subscription validation completed:', hasActiveSubscription);
        // Reload data after validation
        loadSubscriptionInfo();
      }
    }
  });

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    if (user && isMounted.current) {
      console.log('SubscriptionInfo: User loaded, starting immediate data load...');
      loadSubscriptionInfo()
      loadUserProfile()
    }
  }, [user])

  const loadUserProfile = async () => {
    if (!user?.id || !isMounted.current) {
      console.log('User ID não disponível para carregar perfil')
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('assinaturaid')
        .eq('id', user.id)
        .maybeSingle()

      if (!isMounted.current) return

      if (!error && data) {
        setUserProfile(data)
      } else if (error) {
        console.error('Erro ao carregar perfil:', error)
        setUserProfile(null)
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
      if (isMounted.current) {
        setUserProfile(null)
      }
    }
  }

  const loadSubscriptionInfo = async () => {
    if (!user?.id || !isMounted.current) {
      console.log('User ID não disponível')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log('Carregando informações da assinatura...')
      
      // Buscar dados da tabela subscriptions local
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!isMounted.current) return

      if (error) {
        console.error('Erro ao carregar assinatura local:', error)
        // Não throw error para evitar quebrar o componente
        setSubscriptionData(null)
        return
      }

      if (data) {
        console.log('Dados da assinatura carregados:', data)
        // Converter status para o tipo correto
        const normalizedData: SubscriptionData = {
          ...data,
          status: (data.status as 'active' | 'inactive' | 'cancelled' | 'suspended') || 'inactive'
        }
        if (isMounted.current) {
          setSubscriptionData(normalizedData)
        }
      } else {
        console.log('Nenhuma assinatura encontrada localmente')
        if (isMounted.current) {
          setSubscriptionData(null)
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar assinatura:', error)
      if (isMounted.current) {
        setSubscriptionData(null)
        // Toast apenas se for um erro crítico
        if (error.code !== 'PGRST116') { // PGRST116 é "not found"
          toast({
            title: "Erro ao carregar assinatura",
            description: "Houve um problema ao carregar os dados da assinatura",
            variant: "destructive",
          })
        }
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }

  const syncSubscriptionData = async () => {
    if (!user?.id || !isMounted.current) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      })
      return
    }

    try {
      setSyncing(true)
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
        console.error('Erro na resposta da sincronização:', response.error)
        throw response.error
      }

      console.log('Sincronização concluída com sucesso:', response.data?.message || "Dados sincronizados")

      // Recarregar dados após sincronização
      if (isMounted.current) {
        await Promise.all([
          loadSubscriptionInfo(),
          loadUserProfile()
        ])

        toast({
          title: "Sincronização concluída",
          description: "Dados da assinatura atualizados com sucesso",
        })
      }
    } catch (error: any) {
      console.error('Erro na sincronização:', error)
      if (isMounted.current) {
        toast({
          title: "Erro na sincronização",
          description: error.message || "Ocorreu um erro durante a sincronização",
          variant: "destructive",
        })
      }
    } finally {
      if (isMounted.current) {
        setSyncing(false)
      }
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Informações da Assinatura
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Carregando...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!subscriptionData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Informações da Assinatura
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto" />
            <div className="space-y-2">
              <p className="text-muted-foreground">Nenhuma assinatura encontrada</p>
              {userProfile?.assinaturaid && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span>ID da Assinatura: {userProfile.assinaturaid}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Clique em sincronizar para carregar os dados completos
                  </p>
                </div>
              )}
            </div>
            <Button onClick={syncSubscriptionData} disabled={syncing} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Dados'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Informações da Assinatura
              {subscriptionData.status === 'active' && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Ativo</span>
                </div>
              )}
            </div>
            <Button onClick={syncSubscriptionData} disabled={syncing} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Atualizar'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-current"></div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-1">
                <SubscriptionStatusBadge status={subscriptionData.status.toUpperCase()} />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <SubscriptionDetails subscriptionData={subscriptionData} />
          
          <Separator />
          
          {subscriptionData.card_brand && subscriptionData.card_last_four && (
            <PaymentMethod creditCard={{
              creditCardNumber: subscriptionData.card_last_four,
              creditCardBrand: subscriptionData.card_brand,
              creditCardToken: ''
            }} />
          )}
        </CardContent>
      </Card>
  )
}
