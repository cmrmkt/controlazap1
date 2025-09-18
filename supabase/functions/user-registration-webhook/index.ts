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
    console.log('=== USER REGISTRATION WEBHOOK START ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create Supabase client with service role for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const body = await req.json();
    console.log('✅ Request body received:', JSON.stringify(body, null, 2));

    const { 
      email, 
      phone, 
      name,
      password,
      contact_type = 'email',
      metadata = {},
      payment_provider,
      subscription_id,
      customer_id 
    } = body;

    // Validar dados obrigatórios
    const contactInfo = contact_type === 'email' ? email : phone;
    
    if (!contactInfo) {
      console.error('❌ Missing required contact information');
      return new Response(JSON.stringify({ 
        error: 'Email ou telefone é obrigatório',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Contact info validated:', contactInfo, 'Type:', contact_type);

    // Buscar ou criar usuário usando a nova função RPC
    console.log('🔍 Calling find_or_create_user_by_contact...');
    const { data: result, error: rpcError } = await supabase.rpc(
      'find_or_create_user_by_contact',
      {
        contact_info: contactInfo,
        contact_type: contact_type,
        user_name: name
      }
    );

    if (rpcError) {
      console.error('❌ Error calling find_or_create_user_by_contact:', rpcError);
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
      console.error('❌ Failed to create/find user:', result.error);
      return new Response(JSON.stringify({ 
        error: result.error,
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ User obtained - ID:', result.user_id, 'Found existing:', result.found);

    // Criar usuário auth se senha fornecida e usuário é novo
    if (password && !result.found && email) {
      console.log('🔐 Creating auth user for email:', email);
      try {
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: email,
          password: password,
          user_metadata: {
            name: name,
            phone: phone
          }
        });

        if (authError) {
          console.error('⚠️ Auth user creation failed:', authError.message);
          // Continue sem falhar o processo todo
        } else {
          console.log('✅ Auth user created:', authUser.user?.id);
          
          // Atualizar profile com o ID do auth user se diferente
          if (authUser.user?.id && authUser.user.id !== result.user_id) {
            console.log('🔄 Updating profile with auth user ID');
            const { error: idUpdateError } = await supabase
              .from('profiles')
              .update({ id: authUser.user.id })
              .eq('id', result.user_id);
            
            if (idUpdateError) {
              console.error('⚠️ Failed to update profile ID:', idUpdateError);
            } else {
              // Update result with new ID
              result.user_id = authUser.user.id;
            }
          }
        }
      } catch (authCreateError) {
        console.error('⚠️ Auth user creation exception:', authCreateError);
      }
    }

    // Determinar provider e assinatura ID
    let finalSubscriptionId = subscription_id;
    let detectedProvider = payment_provider;

    // Detectar provider automaticamente se não fornecido
    if (!detectedProvider && subscription_id) {
      if (subscription_id?.toString().startsWith('pp_')) {
        detectedProvider = 'perfectpay';
      } else if (subscription_id?.toString().startsWith('sub_')) {
        detectedProvider = 'asaas';
      } else if (!subscription_id?.toString().includes('_')) {
        detectedProvider = 'kiwify';
      } else {
        detectedProvider = 'unknown';
      }
    }

    console.log('💳 Payment provider detected:', {
      provider: detectedProvider,
      originalId: subscription_id,
      finalId: finalSubscriptionId
    });

    // Atualizar perfil com dados de assinatura
    const profileUpdateData: any = {
      ativo: true,
      updated_at: new Date().toISOString()
    };

    if (finalSubscriptionId) {
      if (detectedProvider === 'kiwify') {
        profileUpdateData.assinaturaid = finalSubscriptionId.toString();
      } else {
        profileUpdateData.subscription_id = finalSubscriptionId.toString();
      }
    }

    if (customer_id) {
      profileUpdateData.customerid = customer_id.toString();
    }

    console.log('📝 Updating profile with data:', profileUpdateData);
    const { error: updateError } = await supabase
      .from('profiles')
      .update(profileUpdateData)
      .eq('id', result.user_id);

    if (updateError) {
      console.error('❌ Error updating profile with subscription data:', updateError);
      return new Response(JSON.stringify({ 
        error: 'Erro ao atualizar perfil do usuário',
        details: updateError.message,
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Profile updated successfully');

    // Criar registro de assinatura se ID fornecido
    if (finalSubscriptionId) {
      const subscriptionData = {
        user_id: result.user_id,
        subscription_id: finalSubscriptionId.toString(),
        status: 'active',
        plan_name: detectedProvider === 'perfectpay' ? 'Perfect Pay - Plano Anual' : 
                   detectedProvider === 'kiwify' ? 'Kiwify - Plano Anual' : 
                   detectedProvider === 'asaas' ? 'Asaas - Plano Anual' : 'Plano Anual',
        amount: 5.00,
        currency: 'BRL',
        cycle: 'yearly',
        start_date: new Date().toISOString(),
        next_payment_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        payment_method: 'credit_card',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('💰 Creating subscription record:', subscriptionData);
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .upsert(subscriptionData, { 
          onConflict: 'user_id,subscription_id',
          ignoreDuplicates: false 
        });

      if (subscriptionError) {
        console.error('⚠️ Error creating subscription record:', subscriptionError);
        // Não falhar o processo todo por erro de subscription
      } else {
        console.log('✅ Subscription record created successfully for provider:', detectedProvider);
      }
    }

    const response = {
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
    };

    console.log('🎉 USER REGISTRATION COMPLETED SUCCESSFULLY');
    console.log('Response:', JSON.stringify(response, null, 2));
    console.log('=== USER REGISTRATION WEBHOOK END ===');

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 UNEXPECTED ERROR in user-registration-webhook:', error);
    console.error('Error stack:', error.stack);
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