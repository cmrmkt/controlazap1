import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface UseAutoWhatsAppValidationProps {
  phone?: string;
  onValidationComplete?: (validated: boolean) => void;
}

export function useAutoWhatsAppValidation({ 
  phone, 
  onValidationComplete 
}: UseAutoWhatsAppValidationProps) {
  const { user } = useAuth();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const validateWhatsApp = useCallback(async (phoneNumber: string) => {
    if (!phoneNumber || !user || !isMounted.current) return;

    try {
      console.log('Auto-validating WhatsApp for phone:', phoneNumber);

      // Call the auto-validate edge function
      const { data, error } = await supabase.functions.invoke('auto-validate-whatsapp', {
        body: { 
          phone: phoneNumber,
          userId: user.id 
        }
      });

      if (!isMounted.current) return;

      if (error) {
        console.error('Auto-validation error:', error);
        return;
      }

      const isValidated = data?.validated === true;
      
      if (isValidated) {
        console.log('WhatsApp auto-validated successfully');
      } else {
        console.log('WhatsApp auto-validation failed');
      }

      if (isMounted.current) {
        onValidationComplete?.(isValidated);
      }
      
    } catch (error) {
      console.error('Error in auto-validation:', error);
    }
  }, [user, onValidationComplete]);

  // Auto-validate when phone changes - otimizado
  useEffect(() => {
    if (phone && user && isMounted.current) {
      console.log('Auto WhatsApp validation: Phone and user available, scheduling validation...');
      // Debounce reduzido para melhor performance
      const timer = setTimeout(() => {
        if (isMounted.current && phone && user) {
          console.log('Auto WhatsApp validation: Executing validation for phone:', phone);
          validateWhatsApp(phone);
        } else {
          console.log('Auto WhatsApp validation: Prerequisites not met, skipping...');
        }
      }, 500); // Reduzido para 500ms para carregamento mais rápido

      return () => clearTimeout(timer);
    }
  }, [phone, user, validateWhatsApp]);

  return {
    validateWhatsApp: useCallback((phoneNumber: string) => {
      if (isMounted.current) {
        return validateWhatsApp(phoneNumber);
      }
    }, [validateWhatsApp])
  };
}