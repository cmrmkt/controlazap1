import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppRequest {
  phone: string;
  userId: string;
}

interface VerifyCodeRequest {
  phone: string;
  code: string;
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
    const url = new URL(req.url);
    
    // Check if this is a verification request
    if (url.pathname.includes('/verify')) {
      const { phone, code, userId }: VerifyCodeRequest = await req.json();

      if (!phone || !code || !userId) {
        return new Response(
          JSON.stringify({ error: 'Phone, code, and userId are required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Verify the code using our database function
      const { data: isValid, error: verifyError } = await supabaseClient
        .rpc('verify_phone_code', {
          p_user_id: userId,
          p_phone: phone,
          p_code: code
        });

      if (verifyError) {
        console.error('Error verifying phone code:', verifyError);
        return new Response(
          JSON.stringify({ error: 'Erro ao verificar código' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (isValid) {
        // Log successful verification
        await supabaseClient.rpc('log_auth_attempt', {
          p_user_id: userId,
          p_event_type: 'phone_verified',
          p_success: true,
          p_metadata: { phone: phone }
        });

        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Telefone verificado com sucesso'
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } else {
        // Log failed verification
        await supabaseClient.rpc('log_auth_attempt', {
          p_user_id: userId,
          p_event_type: 'phone_verification_failed',
          p_success: false,
          p_metadata: { phone: phone }
        });

        return new Response(
          JSON.stringify({ 
            error: 'Código inválido ou expirado'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Default behavior: send verification code
    const { phone, userId }: WhatsAppRequest = await req.json();

    if (!phone || !userId) {
      return new Response(
        JSON.stringify({ error: 'Phone and userId are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate phone format (Brazilian format)
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneRegex = /^55\d{10,11}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return new Response(
        JSON.stringify({ 
          error: 'Formato de telefone inválido. Use formato brasileiro: 5511999999999' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Get WhatsApp API credentials from environment
    const whatsappApiUrl = Deno.env.get('WHATSAPP_API_URL');
    const whatsappApiUser = Deno.env.get('WHATSAPP_API_USER');
    const whatsappApiPassword = Deno.env.get('WHATSAPP_API_PASSWORD');

    if (!whatsappApiUrl || !whatsappApiUser || !whatsappApiPassword) {
      console.error('WhatsApp API credentials not configured');
      return new Response(
        JSON.stringify({ error: 'WhatsApp API not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Send WhatsApp message
    const whatsappPayload = {
      phone: cleanPhone,
      message: `Seu código de verificação ControlaZap é: ${verificationCode}. Este código expira em 5 minutos.`
    };

    const whatsappResponse = await fetch(whatsappApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${whatsappApiUser}:${whatsappApiPassword}`)}`,
      },
      body: JSON.stringify(whatsappPayload),
    });

    if (!whatsappResponse.ok) {
      const errorText = await whatsappResponse.text();
      console.error('WhatsApp API error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao enviar mensagem WhatsApp',
          details: errorText 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Store verification code in database with expiry
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutes expiry

    const { error: dbError } = await supabaseClient
      .from('phone_verifications')
      .upsert({
        user_id: userId,
        phone: cleanPhone,
        verification_code: verificationCode,
        expires_at: expiresAt.toISOString(),
        verified: false,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,phone'
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar código de verificação' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Log successful code sending
    await supabaseClient.rpc('log_auth_attempt', {
      p_user_id: userId,
      p_event_type: 'phone_verification_sent',
      p_success: true,
      p_metadata: { phone: cleanPhone }
    });

    console.log(`Verification code sent to ${cleanPhone} for user ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Código de verificação enviado via WhatsApp'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in validate-whatsapp function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);