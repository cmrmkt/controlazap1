import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log('User registration webhook received:', body);

    const { 
      email, 
      phone, 
      name, 
      contact_type = 'email',
      metadata = {},
      payment_provider,
      subscription_id,
      customer_id 
    } = body;

    // Validar dados obrigatórios
    const contactInfo = contact_type === 'email' ? email : phone;
    
    if (!contactInfo) {
      console.log('Missing required contact information');
      return new Response(JSON.stringify({ 
        error: 'Email ou telefone é obrigatório',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar ou criar usuário usando a nova função RPC
    const { data: result, error: rpcError } = await supabase.rpc(
      'find_or_create_user_by_contact',
      {
        contact_info: contactInfo,
        contact_type: contact_type,
        user_name: name
      }
    );

    if (rpcError) {
      console.error('Error calling find_or_create_user_by_contact:', rpcError);
      return new Response(JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: rpcError.message,
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!result.success) {
      console.log('Failed to create/find user:', result.error);
      return new Response(JSON.stringify({ 
        error: result.error,
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determinar provider e assinatura ID
    let finalSubscriptionId = subscription_id;
    let detectedProvider = payment_provider;

    // Detectar Perfect Pay vs Asaas vs Kiwify automaticamente
    if (!detectedProvider) {
      if (subscription_id === 'active' || !subscription_id) {
        detectedProvider = 'perfectpay';
        finalSubscriptionId = `pp_${result.user_id.substring(0, 8)}_${Date.now()}`;
      } else if (subscription_id?.startsWith('sub_')) {
        detectedProvider = 'asaas';
        finalSubscriptionId = subscription_id;
      } else if (subscription_id?.startsWith('KW_') || subscription_id?.includes('kiwify')) {
        detectedProvider = 'kiwify';
        finalSubscriptionId = subscription_id.startsWith('KW_') ? subscription_id : `KW_${subscription_id}`;
      } else {
        detectedProvider = 'unknown';
        finalSubscriptionId = subscription_id || `unknown_${result.user_id.substring(0, 8)}`;
      }
    }

    console.log('Payment provider detected:', {
      provider: detectedProvider,
      originalId: subscription_id,
      finalId: finalSubscriptionId
    });

    // Atualizar perfil com dados de assinatura padronizados
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        assinaturaid: finalSubscriptionId,
        customerid: customer_id,
        ativo: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', result.user_id);

    if (updateError) {
      console.error('Error updating profile with subscription data:', updateError);
      // Não falhar aqui, apenas logar o erro
    }

    // Criar registro de assinatura padrão baseado no provider
    const subscriptionData = {
      user_id: result.user_id,
      subscription_id: finalSubscriptionId,
      status: 'active',
      plan_name: detectedProvider === 'perfectpay' ? 'Perfect Pay - Plano Anual' : 
                 detectedProvider === 'kiwify' ? 'Kiwify - Plano Anual' : 'Asaas - Plano Anual',
      amount: 5.00,
      currency: 'BRL',
      cycle: 'yearly',
      start_date: new Date().toISOString(),
      next_payment_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      payment_method: 'credit_card',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .upsert(subscriptionData, { 
        onConflict: 'user_id,subscription_id',
        ignoreDuplicates: false 
      });

    if (subscriptionError) {
      console.error('Error creating subscription record:', subscriptionError);
      // Não falhar aqui, apenas logar o erro
    } else {
      console.log('Subscription record created successfully for provider:', detectedProvider);
    }


    console.log(`User ${result.found ? 'found' : 'created'} successfully:`, {
      user_id: result.user_id,
      email: result.email,
      phone: result.phone,
      provider: detectedProvider,
      subscription_id: finalSubscriptionId
    });

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: result.user_id,
        email: result.email,
        phone: result.phone,
        name: result.name,
        subscription_id: finalSubscriptionId,
        provider: detectedProvider
      },
      created: !result.found,
      message: result.found ? 'Usuário encontrado' : 'Usuário criado com sucesso'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in user-registration-webhook:', error);
    return new Response(JSON.stringify({ 
      error: 'Erro interno do servidor',
      details: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});