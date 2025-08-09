import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface WhatsAppHookReturn {
  isLoading: boolean;
  sendVerificationCode: (phone: string) => Promise<boolean>;
  verifyCode: (phone: string, code: string) => Promise<boolean>;
}

export function useWhatsApp(): WhatsAppHookReturn {
  const [isLoading, setIsLoading] = useState(false);

  const sendVerificationCode = async (phone: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        return false;
      }

      // Call the external API with Basic Auth
      const response = await fetch('https://webhook.poupeizap.com/webhook/verifica-zap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa('USUARIO:SENHA')
        },
        body: JSON.stringify({
          phone: phone,
          userId: user.id
        })
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data?.error) {
        toast({
          title: "Erro",
          description: data.error || "Erro ao enviar código de verificação",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Sucesso",
        description: "Código de verificação enviado via WhatsApp",
      });
      
      return true;
    } catch (error: any) {
      console.error('Error in sendVerificationCode:', error);
      toast({
        title: "Erro",
        description: "Erro interno ao enviar código",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async (phone: string, code: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        return false;
      }

      // Call the external API with Basic Auth for verification
      const response = await fetch('https://webhook.poupeizap.com/webhook/verifica-zap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa('USUARIO:SENHA')
        },
        body: JSON.stringify({
          phone: phone,
          code: code,
          userId: user.id
        })
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data?.success) {
        toast({
          title: "Sucesso",
          description: "Telefone verificado com sucesso!",
        });
        return true;
      } else {
        toast({
          title: "Erro",
          description: data?.error || "Código inválido ou expirado",
          variant: "destructive",
        });
        return false;
      }
    } catch (error: any) {
      console.error('Error in verifyCode:', error);
      toast({
        title: "Erro",
        description: "Erro interno ao verificar código",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    sendVerificationCode,
    verifyCode,
  };
}