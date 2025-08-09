import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface UseAutoSubscriptionValidationProps {
  onValidationComplete?: (hasActiveSubscription: boolean) => void;
  enablePeriodicCheck?: boolean;
}

export function useAutoSubscriptionValidation({ 
  onValidationComplete,
  enablePeriodicCheck = true
}: UseAutoSubscriptionValidationProps) {
  const { user } = useAuth();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const validateSubscription = useCallback(async () => {
    if (!user || !isMounted.current) return;

    try {
      console.log('Auto-validating subscription for user:', user.id);

      // Call the sync-subscription edge function
      const { data, error } = await supabase.functions.invoke('sync-subscription', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (!isMounted.current) return;

      if (error) {
        console.error('Subscription auto-validation error:', error);
        return;
      }

      const hasActiveSubscription = data?.hasActiveSubscription === true;
      
      if (hasActiveSubscription) {
        console.log('Subscription auto-validated successfully');
      } else {
        console.log('No active subscription found');
      }

      if (isMounted.current) {
        onValidationComplete?.(hasActiveSubscription);
      }
      
    } catch (error) {
      console.error('Error in subscription auto-validation:', error);
    }
  }, [user, onValidationComplete]);

  // Auto-validate when user loads
  useEffect(() => {
    if (user && isMounted.current) {
      console.log('Auto subscription validation: User available, scheduling validation...');
      const timer = setTimeout(() => {
        if (isMounted.current && user) {
          console.log('Auto subscription validation: Executing validation for user:', user.id);
          validateSubscription();
        }
      }, 1000); // Wait 1 second for initial load

      return () => clearTimeout(timer);
    }
  }, [user, validateSubscription]);

  // Periodic validation (every 5 minutes)
  useEffect(() => {
    if (!enablePeriodicCheck || !user || !isMounted.current) return;

    const interval = setInterval(() => {
      if (isMounted.current && user) {
        console.log('Periodic subscription validation check');
        validateSubscription();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user, validateSubscription, enablePeriodicCheck]);

  return {
    validateSubscription: useCallback(() => {
      if (isMounted.current) {
        return validateSubscription();
      }
    }, [validateSubscription])
  };
}