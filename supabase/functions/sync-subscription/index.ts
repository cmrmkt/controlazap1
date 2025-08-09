
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-SUBSCRIPTION] ${step}${detailsStr}`);
};

const calculateNextPaymentDate = (startDate: string, cycle: string): string => {
  const start = new Date(startDate);
  
  switch (cycle?.toLowerCase()) {
    case 'yearly':
      start.setFullYear(start.getFullYear() + 1);
      break;
    case 'monthly':
      start.setMonth(start.getMonth() + 1);
      break;
    case 'quarterly':
      start.setMonth(start.getMonth() + 3);
      break;
    default:
      // Default to yearly if cycle is unknown
      start.setFullYear(start.getFullYear() + 1);
  }
  
  return start.toISOString();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Buscar perfil do usuário para obter assinaturaid
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('assinaturaid, customerid')
      .eq('id', user.id)
      .single();

    logStep("Profile data fetched", { profile, profileError });

    if (profileError || (!profile?.assinaturaid && !profile?.customerid)) {
      logStep("No subscription ID found in profile");
      
      // Criar dados básicos se não houver subscription ID
      const basicSubscriptionData = {
        user_id: user.id,
        subscription_id: 'no-subscription',
        status: 'inactive',
        plan_name: 'Sem Plano',
        amount: 0,
        currency: 'BRL',
        cycle: null,
        start_date: null,
        next_payment_date: null,
        payment_method: null,
        card_last_four: null,
        card_brand: null,
        updated_at: new Date().toISOString(),
      };

      const { data: savedData, error: saveError } = await supabaseClient
        .from('subscriptions')
        .upsert(basicSubscriptionData, { 
          onConflict: 'user_id,subscription_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (saveError) {
        logStep("Error saving basic subscription data", saveError);
      } else {
        logStep("Basic subscription data saved", savedData);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        data: savedData || basicSubscriptionData,
        message: "No subscription ID found, created basic data"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Determinar tipo de assinatura e ID
    const subscriptionId = profile.assinaturaid || profile.customerid || 'no-subscription';
    logStep("Found subscription data", { 
      subscriptionId, 
      assinaturaid: profile.assinaturaid, 
      customerid: profile.customerid 
    });

    // Verificar se é Perfect Pay (aceitar 'active', 'pp_*', 'PPSUB*' e customerid que começe com 'PP')
    const isPerfectPay = profile.assinaturaid === 'active' || 
                        (profile.assinaturaid && profile.assinaturaid.startsWith('pp_')) || 
                        (profile.assinaturaid && profile.assinaturaid.startsWith('PPSUB')) ||
                        (profile.customerid && profile.customerid.startsWith('PP'));
    
    // Verificar se é Asaas (assinaturaid ou customerid que começam com 'ASA')
    const isAsaas = (profile.assinaturaid && profile.assinaturaid.startsWith('ASA')) ||
                    (profile.customerid && profile.customerid.startsWith('ASA'));
    
    logStep("Subscription type detected", { isPerfectPay, isAsaas, subscriptionId });
    
    if (isPerfectPay) {
      logStep("Perfect Pay subscription detected", { subscriptionId });
      
      // Primeiro verificar se já existe um registro
      const { data: existingSubscription } = await supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('subscription_id', subscriptionId)
        .maybeSingle();

      if (existingSubscription) {
        logStep("Found existing Perfect Pay subscription", existingSubscription);
        return new Response(JSON.stringify({ 
          success: true, 
          data: existingSubscription,
          message: "Perfect Pay subscription found"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      // Se não existe, criar novo registro
      logStep("Creating new Perfect Pay subscription record");
      const currentDate = new Date().toISOString();
      const perfectPayData = {
        user_id: user.id,
        subscription_id: subscriptionId,
        status: 'active',
        plan_name: 'Perfect Pay - Plano Anual',
        amount: 5.00,
        currency: 'BRL',
        cycle: 'yearly',
        start_date: currentDate,
        next_payment_date: calculateNextPaymentDate(currentDate, 'yearly'),
        payment_method: 'credit_card',
        card_last_four: null,
        card_brand: 'Perfect Pay',
        updated_at: currentDate,
      };

      const { data: savedData, error: saveError } = await supabaseClient
        .from('subscriptions')
        .upsert(perfectPayData, { 
          onConflict: 'user_id,subscription_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (saveError) {
        logStep("Error saving Perfect Pay subscription data", saveError);
        
        // Em caso de erro, retornar dados básicos para não travar
        return new Response(JSON.stringify({ 
          success: true, 
          data: perfectPayData,
          message: "Perfect Pay subscription data (fallback due to save error)"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("Perfect Pay subscription data saved successfully", savedData);

      return new Response(JSON.stringify({ 
        success: true, 
        data: savedData,
        message: "Perfect Pay subscription synchronized successfully"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Para Asaas ou outros - tentar buscar dados da API externa
    if (isAsaas) {
      logStep("Asaas subscription detected, using Asaas-specific data");
      
      // Primeiro verificar se já existe um registro
      const { data: existingSubscription } = await supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('subscription_id', subscriptionId)
        .maybeSingle();

      if (existingSubscription) {
        logStep("Found existing Asaas subscription", existingSubscription);
        return new Response(JSON.stringify({ 
          success: true, 
          data: existingSubscription,
          message: "Asaas subscription found"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      // Se não existe, criar novo registro para Asaas
      const currentDate = new Date().toISOString();
      const asaasData = {
        user_id: user.id,
        subscription_id: subscriptionId,
        status: 'active',
        plan_name: 'Asaas - Plano Anual',
        amount: 5.00,
        currency: 'BRL',
        cycle: 'yearly',
        start_date: currentDate,
        next_payment_date: calculateNextPaymentDate(currentDate, 'yearly'),
        payment_method: 'credit_card',
        card_last_four: null,
        card_brand: 'Asaas',
        updated_at: currentDate,
      };

      const { data: savedData, error: saveError } = await supabaseClient
        .from('subscriptions')
        .upsert(asaasData, { 
          onConflict: 'user_id,subscription_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (saveError) {
        logStep("Error saving Asaas subscription data", saveError);
        
        return new Response(JSON.stringify({ 
          success: true, 
          data: asaasData,
          message: "Asaas subscription data (fallback due to save error)"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("Asaas subscription data saved successfully", savedData);

      return new Response(JSON.stringify({ 
        success: true, 
        data: savedData,
        message: "Asaas subscription synchronized successfully"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Para outros tipos - tentar buscar dados da API externa
    try {
      const username = Deno.env.get('CONTROLZAP_BASIC_USERNAME') ?? '';
      const password = Deno.env.get('CONTROLZAP_BASIC_PASSWORD') ?? '';

      const response = await fetch('https://webhook.controlazap.site/webhook/assinatura/info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa(`${username}:${password}`)
        },
        body: JSON.stringify({
          subscription: subscriptionId
        })
      });

      logStep("External API response status", { status: response.status, statusText: response.statusText });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const externalData = await response.json();
      logStep("External data fetched successfully", externalData);

      // Mapear dados externos para formato local
      const subscriptionData = {
        user_id: user.id,
        subscription_id: subscriptionId,
        status: externalData.status?.toLowerCase() || 'active',
        plan_name: externalData.planName || 'Plano Anual',
        amount: externalData.valor || 5.00,
        currency: 'BRL',
        cycle: externalData.ciclo || 'yearly',
        start_date: externalData.dataAssinatura || new Date().toISOString(),
        next_payment_date: externalData.proimoPagamento || calculateNextPaymentDate(
          externalData.dataAssinatura || new Date().toISOString(), 
          externalData.ciclo || 'yearly'
        ),
        payment_method: 'credit_card',
        card_last_four: externalData.creditCard?.creditCardNumber || null,
        card_brand: externalData.creditCard?.creditCardBrand || null,
        updated_at: new Date().toISOString(),
      };

      // Inserir ou atualizar dados na tabela subscriptions
      const { data: savedData, error: saveError } = await supabaseClient
        .from('subscriptions')
        .upsert(subscriptionData, { 
          onConflict: 'user_id,subscription_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (saveError) {
        logStep("Error saving subscription data", saveError);
        throw saveError;
      }

      logStep("Subscription data synchronized successfully", savedData);

      return new Response(JSON.stringify({ 
        success: true, 
        data: savedData 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } catch (apiError: any) {
      logStep("External API error, creating fallback data", { error: apiError.message });
      
      // Verificar se já existe um registro para este usuário e subscription
      const { data: existingSubscription } = await supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('subscription_id', subscriptionId)
        .single();

      if (existingSubscription) {
        logStep("Found existing subscription, returning it", existingSubscription);
        return new Response(JSON.stringify({ 
          success: true, 
          data: existingSubscription,
          message: "External API failed, returning existing data"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      // Criar dados de fallback com subscription ID válido - assumindo plano anual
      const currentDate = new Date().toISOString();
      const fallbackSubscriptionData = {
        user_id: user.id,
        subscription_id: subscriptionId,
        status: 'active',
        plan_name: 'Plano Anual',
        amount: 5.00,
        currency: 'BRL',
        cycle: 'yearly',
        start_date: currentDate,
        next_payment_date: calculateNextPaymentDate(currentDate, 'yearly'),
        payment_method: 'credit_card',
        card_last_four: null,
        card_brand: null,
        updated_at: currentDate,
      };

      const { data: savedData, error: saveError } = await supabaseClient
        .from('subscriptions')
        .upsert(fallbackSubscriptionData, { 
          onConflict: 'user_id,subscription_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (saveError) {
        logStep("Error saving fallback subscription data", saveError);
        throw saveError;
      }

      logStep("Fallback subscription data saved", savedData);

      return new Response(JSON.stringify({ 
        success: true, 
        data: savedData,
        message: "External API failed, saved fallback data with yearly plan"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in sync-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
