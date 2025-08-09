import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Subscription {
  id: string;
  user_id: string;
  status: string;
  plan_name: string | null;
  card_brand: string | null;
  card_last_four: string | null;
  created_at: string;
  updated_at: string;
}

interface SubscriptionHookReturn {
  subscription: Subscription | null;
  isLoading: boolean;
  syncSubscription: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

export function useSubscription(): SubscriptionHookReturn {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchSubscription = async () => {
    if (!user || !isMounted.current) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      console.log('[useSubscription] Fetching subscription for user:', user.id);
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!isMounted.current) return;

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error fetching subscription:', error);
        // Não mostrar toast para não incomodar o usuário no login
      } else {
        console.log('[useSubscription] Subscription data:', data);
        setSubscription(data);
      }
    } catch (error: any) {
      console.error('Error in fetchSubscription:', error);
      if (isMounted.current) {
        setSubscription(null);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const syncSubscription = async () => {
    if (!user || !isMounted.current) return;

    try {
      console.log('[useSubscription] Starting subscription sync for user:', user.id);
      
      const { data, error } = await supabase.functions.invoke('sync-subscription', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (!isMounted.current) return;

      if (error) {
        console.error('Error syncing subscription:', error);
        toast({
          title: "Erro",
          description: "Erro ao sincronizar assinatura",
          variant: "destructive",
        });
        return;
      }

      if (data?.success && isMounted.current) {
        console.log('[useSubscription] Sync successful, data:', data.data);
        setSubscription(data.data);
        toast({
          title: "Sucesso",
          description: "Assinatura sincronizada com sucesso",
        });
      }
    } catch (error: any) {
      console.error('Error in syncSubscription:', error);
      if (isMounted.current) {
        toast({
          title: "Erro",
          description: "Erro interno ao sincronizar assinatura",
          variant: "destructive",
        });
      }
    }
  };

  const refreshSubscription = async () => {
    if (isMounted.current) {
      await fetchSubscription();
    }
  };

  useEffect(() => {
    if (user && isMounted.current) {
      console.log('[useSubscription] User authenticated, fetching subscription');
      fetchSubscription();
    }
  }, [user]);

  // Set up real-time subscription updates
  useEffect(() => {
    if (!user || !isMounted.current) return;

    const channel = supabase
      .channel(`subscription-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (!isMounted.current) return;
          
          console.log('Subscription updated:', payload);
          if (payload.eventType === 'DELETE') {
            setSubscription(null);
          } else {
            setSubscription(payload.new as Subscription);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    subscription,
    isLoading,
    syncSubscription,
    refreshSubscription,
  };
}