import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const testId = crypto.randomUUID().substring(0, 8);
    console.log(`[N8N-TEST-${testId}] Testing N8N connection and subscription validation...`);

    // Test user ID - replace with actual user ID from query params if provided
    const url = new URL(req.url);
    const testUserId = url.searchParams.get('userId') || '887edf71-d4c1-4679-96f6-93bf047a9714';
    
    console.log(`[N8N-TEST-${testId}] Testing with user ID: ${testUserId}`);

    // 1. Test user lookup
    const { data: userProfile, error: userError } = await supabaseClient
      .from('profiles')
      .select('id, nome, ativo, assinaturaid, subscription_status, whatsapp, phone')
      .eq('id', testUserId)
      .single();

    if (userError) {
      throw new Error(`User lookup failed: ${userError.message}`);
    }

    console.log(`[N8N-TEST-${testId}] User found:`, {
      id: userProfile.id,
      nome: userProfile.nome,
      ativo: userProfile.ativo,
      assinaturaid: userProfile.assinaturaid,
      subscription_status: userProfile.subscription_status,
      hasWhatsapp: !!userProfile.whatsapp,
      hasPhone: !!userProfile.phone
    });

    // 2. Test subscription validation
    const { data: hasActiveSubscription, error: subscriptionError } = await supabaseClient
      .rpc('has_active_subscription', { user_id_param: testUserId });

    if (subscriptionError) {
      console.warn(`[N8N-TEST-${testId}] Subscription validation warning:`, subscriptionError.message);
    }

    console.log(`[N8N-TEST-${testId}] Subscription validation:`, { hasActiveSubscription });

    // 3. Test subscription table lookup
    const { data: subscriptionRecord, error: subRecordError } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', testUserId)
      .maybeSingle();

    if (subRecordError) {
      console.warn(`[N8N-TEST-${testId}] Subscription record error:`, subRecordError.message);
    }

    console.log(`[N8N-TEST-${testId}] Subscription record:`, subscriptionRecord);

    // 4. Test phone normalization
    const testPhone = userProfile.whatsapp || userProfile.phone || '+5511999999999';
    const { data: normalizedPhone, error: phoneError } = await supabaseClient
      .rpc('normalize_phone_number', { phone_input: testPhone });

    if (phoneError) {
      console.warn(`[N8N-TEST-${testId}] Phone normalization error:`, phoneError.message);
    }

    console.log(`[N8N-TEST-${testId}] Phone normalization:`, { 
      original: testPhone, 
      normalized: normalizedPhone 
    });

    // 5. Test find user by phone
    const { data: foundUserId, error: findError } = await supabaseClient
      .rpc('find_user_by_whatsapp', { phone_input: testPhone });

    if (findError) {
      console.warn(`[N8N-TEST-${testId}] Find user error:`, findError.message);
    }

    console.log(`[N8N-TEST-${testId}] Find user by phone:`, { 
      searchPhone: testPhone, 
      foundUserId,
      matches: foundUserId === testUserId
    });

    // 6. Test health check function
    const { data: healthData, error: healthError } = await supabaseClient
      .rpc('check_n8n_health');

    if (healthError) {
      console.warn(`[N8N-TEST-${testId}] Health check error:`, healthError.message);
    }

    console.log(`[N8N-TEST-${testId}] Health check result:`, healthData);

    // Compile test results
    const testResults = {
      testId,
      timestamp: new Date().toISOString(),
      userValidation: {
        success: !userError,
        user: userProfile,
        error: userError?.message
      },
      subscriptionValidation: {
        hasActiveSubscription,
        subscriptionRecord,
        validationError: subscriptionError?.message,
        recordError: subRecordError?.message
      },
      phoneValidation: {
        originalPhone: testPhone,
        normalizedPhone,
        foundUserId,
        phoneMatches: foundUserId === testUserId,
        normalizationError: phoneError?.message,
        findError: findError?.message
      },
      healthCheck: {
        data: healthData,
        error: healthError?.message
      },
      overallStatus: !userError && hasActiveSubscription ? 'HEALTHY' : 'NEEDS_ATTENTION'
    };

    console.log(`[N8N-TEST-${testId}] Test completed with status: ${testResults.overallStatus}`);

    return new Response(JSON.stringify(testResults, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorId = crypto.randomUUID().substring(0, 8);
    console.error(`[N8N-TEST-ERROR-${errorId}] Test failed:`, {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      errorId,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});