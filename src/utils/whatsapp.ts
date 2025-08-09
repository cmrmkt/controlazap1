
import { supabase } from '@/integrations/supabase/client'

interface WhatsAppValidationResponse {
  exists: string;
  whatsapp: string;
}

export async function validateWhatsAppNumber(phoneNumber: string): Promise<{ exists: boolean; whatsappId?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Usuário não autenticado');
    }

    const response = await supabase.functions.invoke('validate-whatsapp', {
      body: { phoneNumber },
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (response.error) {
      throw new Error(response.error.message || 'Erro ao validar WhatsApp');
    }

    return response.data;
  } catch (error) {
    console.error('Erro na validação do WhatsApp:', error);
    throw new Error('Não foi possível validar o número do WhatsApp');
  }
}
