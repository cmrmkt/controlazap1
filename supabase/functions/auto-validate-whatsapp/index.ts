import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AutoValidateRequest {
  phone: string;
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  try {
    const { phone, userId }: AutoValidateRequest = await req.json();

    if (!phone || !userId) {
      return new Response(
        JSON.stringify({ error: 'Phone and userId are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Auto-validating WhatsApp for user ${userId} with phone ${phone}`);

    // Validate phone format (Brazilian format with international code)
    const cleanPhone = phone.replace(/\D/g, '');
    let formattedPhone = cleanPhone;
    
    // Add country code if not present
    if (!cleanPhone.startsWith('55') && cleanPhone.length === 11) {
      formattedPhone = '55' + cleanPhone;
    }

    // Check if phone is in valid Brazilian format
    const phoneRegex = /^55\d{10,11}$/;
    if (!phoneRegex.test(formattedPhone)) {
      return new Response(
        JSON.stringify({ 
          validated: false,
          error: 'Formato de telefone inválido. Use formato brasileiro com DDD.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Configure WhatsApp validation endpoint
    const n8nApiUrl = 'https://webhook.poupeizap.com/webhook/verifica-zap';
    const n8nApiUser = 'USUARIO';
    const n8nApiPassword = 'SENHA';

    let isWhatsAppValid = false;

    // Validate with WhatsApp endpoint
    try {
      console.log(`Validating phone ${formattedPhone} with WhatsApp endpoint`);
      
      const n8nResponse = await fetch(n8nApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${n8nApiUser}:${n8nApiPassword}`)}`,
        },
        body: JSON.stringify({
          phone: formattedPhone,
          action: 'validate_number'
        }),
      });

      if (n8nResponse.ok) {
        const n8nData = await n8nResponse.json();
        isWhatsAppValid = n8nData?.exists === true || n8nData?.valid === true || n8nData?.success === true;
        console.log(`WhatsApp validation result:`, { isWhatsAppValid, response: n8nData });
      } else {
        console.warn(`WhatsApp API returned status ${n8nResponse.status}`);
        // Try basic validation as fallback
        const mobileRegex = /^55\d{2}9\d{8}$/;
        isWhatsAppValid = mobileRegex.test(formattedPhone);
        console.log(`Using fallback validation for ${formattedPhone}:`, isWhatsAppValid);
      }
    } catch (error) {
      console.error('Error calling WhatsApp API:', error);
      // Try basic validation as fallback
      const mobileRegex = /^55\d{2}9\d{8}$/;
      isWhatsAppValid = mobileRegex.test(formattedPhone);
      console.log(`Using fallback validation for ${formattedPhone}:`, isWhatsAppValid);
    }


    if (isWhatsAppValid) {
      // Update profile with validated WhatsApp number
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          whatsapp: formattedPhone,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        return new Response(
          JSON.stringify({ 
            validated: false,
            error: 'Erro ao salvar validação no perfil' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Log successful validation
      console.log(`WhatsApp validated successfully for user ${userId}`);

      return new Response(
        JSON.stringify({ 
          validated: true,
          phone: formattedPhone,
          message: 'WhatsApp validado automaticamente'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      console.log(`WhatsApp validation failed for ${formattedPhone}`);
      
      return new Response(
        JSON.stringify({ 
          validated: false,
          message: 'Número não encontrado no WhatsApp ou inválido'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error: any) {
    console.error('Error in auto-validate-whatsapp function:', error);
    return new Response(
      JSON.stringify({ 
        validated: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);