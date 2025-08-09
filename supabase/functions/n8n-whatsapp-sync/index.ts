import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

interface N8NWebhookData {
  userId?: string
  phone?: string
  type?: string
  transactionData?: any
  reminderData?: any
  subscription?: {
    status: string
    plan_name?: string
    assinaturaid?: string
  }
  health_check?: boolean
}

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
    const requestId = crypto.randomUUID().substring(0, 8);
    const body = await req.json();
    console.log(`[N8N-SYNC-${requestId}] Received:`, { 
      type: body.type, 
      hasUserId: !!body.userId,
      hasPhone: !!body.phone,
      dataKeys: Object.keys(body).filter(k => !['userId', 'phone', 'type'].includes(k))
    });

    let { userId, phone, transactionData, reminderData, subscription, type, ...directData } = body;
    
    // Support both old format (transactionData/reminderData) and new direct format
    if (!transactionData && !reminderData && !subscription && type) {
      if (type === 'transaction') {
        transactionData = directData;
      } else if (type === 'reminder') {
        reminderData = directData;
      } else if (type === 'subscription') {
        subscription = directData;
      }
    }

    // Enhanced user search with multiple attempts
    if (!userId && phone) {
      console.log(`[N8N-SYNC-${requestId}] Searching user by phone...`);
      
      // Try multiple formats for phone search
      const searchAttempts = [
        phone,
        phone.replace(/\D/g, ''), // digits only
        phone.startsWith('+') ? phone.substring(1) : `+${phone}` // toggle +
      ];
      
      let foundUserId = null;
      for (const attempt of searchAttempts) {
        const { data: userResult, error: searchError } = await supabaseClient
          .rpc('find_user_by_whatsapp', { phone_input: attempt });
        
        if (searchError) {
          console.warn(`[N8N-SYNC-${requestId}] Search failed for ${attempt}:`, searchError.message);
          continue;
        }
        
        if (userResult) {
          foundUserId = userResult;
          console.log(`[N8N-SYNC-${requestId}] User found with pattern: ${attempt}`);
          break;
        }
      }
      
      if (foundUserId) {
        userId = foundUserId;
      }
    }

    if (!userId) {
      console.error(`[N8N-SYNC-${requestId}] No userId found for phone:`, phone);
      return new Response(JSON.stringify({ 
        error: 'userId required or valid phone number needed',
        phone: phone,
        requestId,
        timestamp: new Date().toISOString()
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user exists and get complete profile with subscription info
    const { data: userProfile, error: userError } = await supabaseClient
      .from('profiles')
      .select('id, nome, ativo, assinaturaid, subscription_status, whatsapp, phone')
      .eq('id', userId)
      .single();

    if (userError || !userProfile) {
      console.error(`[N8N-SYNC-${requestId}] User validation failed:`, userError?.message);
      return new Response(JSON.stringify({ 
        error: 'Invalid user',
        userId,
        requestId,
        timestamp: new Date().toISOString()
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normalize and update profile with validated WhatsApp
    if (phone) {
      console.log(`[N8N-SYNC-${requestId}] Normalizing phone: ${phone}`);
      
      const { data: normalizedPhone, error: normalizeError } = await supabaseClient
        .rpc('normalize_phone_number', { phone_input: phone });
      
      if (normalizeError) {
        console.warn(`[N8N-SYNC-${requestId}] Phone normalization failed:`, normalizeError.message);
      }
      
      const finalPhone = normalizedPhone || phone;
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ 
          whatsapp: finalPhone,
          phone: finalPhone,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (updateError) {
        console.error(`[N8N-SYNC-${requestId}] Profile update failed:`, updateError);
      } else {
        console.log(`[N8N-SYNC-${requestId}] Profile updated with phone: ${finalPhone}`);
      }
    }

    let processedData = null;

    // Enhanced transaction processing
    if (transactionData && type === 'transaction') {
      const { valor, tipo, estabelecimento, detalhes, categoria, category, quando } = transactionData;
      console.log(`[N8N-SYNC-${requestId}] Processing transaction:`, { 
        valor, tipo, categoria: categoria || category, estabelecimento 
      });
      
      const categoryName = categoria || category || 'Via WhatsApp';
      
      // Validate required fields
      if (!valor || isNaN(parseFloat(valor))) {
        throw new Error('Transaction requires valid valor amount');
      }

      // Get or create category with improved error handling
      let categoryId;
      const { data: userCategory, error: categoryError } = await supabaseClient
        .from('categorias')
        .select('id')
        .eq('userid', userId)
        .eq('nome', categoryName)
        .maybeSingle();

      if (categoryError) {
        console.error(`[N8N-SYNC-${requestId}] Category fetch error:`, categoryError);
        throw new Error(`Category fetch failed: ${categoryError.message}`);
      }

      if (userCategory) {
        categoryId = userCategory.id;
        console.log(`[N8N-SYNC-${requestId}] Using existing category: ${categoryName}`);
      } else {
        console.log(`[N8N-SYNC-${requestId}] Creating category: ${categoryName}`);
        const { data: newCategory, error: createCategoryError } = await supabaseClient
          .from('categorias')
          .insert({
            userid: userId,
            nome: categoryName,
            tags: 'whatsapp,n8n,auto-created',
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();
        
        if (createCategoryError) {
          console.error(`[N8N-SYNC-${requestId}] Category creation error:`, createCategoryError);
          throw new Error(`Category creation failed: ${createCategoryError.message}`);
        }
        
        categoryId = newCategory.id;
        console.log(`[N8N-SYNC-${requestId}] Created category ID: ${categoryId}`);
      }

      // Create transaction with validation
      const transactionValue = parseFloat(valor);
      const transactionData = {
        userid: userId,
        category_id: categoryId,
        tipo: ['receita', 'despesa'].includes(tipo) ? tipo : 'despesa',
        valor: transactionValue,
        estabelecimento: estabelecimento?.trim() || 'Via WhatsApp',
        detalhes: detalhes?.trim() || 'Transação sincronizada via N8N/WhatsApp',
        quando: quando ? new Date(quando).toISOString() : new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      const { data: transactionResult, error: transactionError } = await supabaseClient
        .from('transacoes')
        .insert(transactionData)
        .select('id, valor, tipo')
        .single();

      if (transactionError) {
        console.error(`[N8N-SYNC-${requestId}] Transaction creation error:`, transactionError);
        throw new Error(`Transaction creation failed: ${transactionError.message}`);
      }
      
      processedData = { 
        transactionId: transactionResult.id, 
        categoryId, 
        valor: transactionResult.valor,
        tipo: transactionResult.tipo 
      };
      console.log(`[N8N-SYNC-${requestId}] Transaction created: ${transactionResult.id} - R$ ${transactionValue}`);
    }

    // Enhanced reminder processing
    if (reminderData && type === 'reminder') {
      const { descricao, valor, data, icon, status, is_recurring, repeat_months } = reminderData;
      console.log(`[N8N-SYNC-${requestId}] Processing reminder:`, { descricao, valor, data });
      
      // Validate required fields
      if (!descricao || descricao.trim().length === 0) {
        throw new Error('Reminder requires valid descricao');
      }

      const reminderData = {
        userid: userId,
        descricao: descricao.trim(),
        valor: valor ? parseFloat(valor) : null,
        data: data ? new Date(data).toISOString() : new Date().toISOString(),
        status: ['pending', 'completed', 'cancelled'].includes(status) ? status : 'pending',
        icon: icon || 'message-square',
        is_recurring: Boolean(is_recurring),
        repeat_months: parseInt(repeat_months) || 1,
        created_at: new Date().toISOString()
      };

      const { data: reminderResult, error: reminderError } = await supabaseClient
        .from('lembretes')
        .insert(reminderData)
        .select('id, descricao, valor')
        .single();

      if (reminderError) {
        console.error(`[N8N-SYNC-${requestId}] Reminder creation error:`, reminderError);
        throw new Error(`Reminder creation failed: ${reminderError.message}`);
      }
      
      processedData = { 
        reminderId: reminderResult.id, 
        descricao: reminderResult.descricao,
        valor: reminderResult.valor 
      };
      console.log(`[N8N-SYNC-${requestId}] Reminder created: ${reminderResult.id} - ${reminderResult.descricao}`);
    }

    // Enhanced subscription processing with complete validation
    if (subscription && type === 'subscription') {
      const { status, plan_name, assinaturaid } = subscription;
      console.log(`[N8N-SYNC-${requestId}] Processing subscription:`, { status, plan_name, assinaturaid });
      
      // Verify subscription status with comprehensive validation
      const { data: hasActiveSubscription } = await supabaseClient
        .rpc('has_active_subscription', { user_id_param: userId });
      
      console.log(`[N8N-SYNC-${requestId}] Current subscription status:`, { 
        hasActiveSubscription, 
        profileAssinaturaid: userProfile.assinaturaid,
        profileSubscriptionStatus: userProfile.subscription_status 
      });
      
      // Update profile with subscription info
      const profileUpdates: any = { updated_at: new Date().toISOString() };
      
      if (assinaturaid) {
        profileUpdates.assinaturaid = assinaturaid;
      }
      
      if (status) {
        profileUpdates.subscription_status = status;
      }
      
      const { error: profileUpdateError } = await supabaseClient
        .from('profiles')
        .update(profileUpdates)
        .eq('id', userId);
      
      if (profileUpdateError) {
        console.error(`[N8N-SYNC-${requestId}] Profile subscription update failed:`, profileUpdateError);
      } else {
        console.log(`[N8N-SYNC-${requestId}] Profile updated with subscription info`);
      }
      
      // Update or create subscription record
      const subscriptionData = {
        user_id: userId,
        subscription_id: assinaturaid || 'no-subscription',
        status: status || 'inactive',
        plan_name: plan_name || 'Sem Plano',
        updated_at: new Date().toISOString()
      };
      
      const { data: existingSubscription } = await supabaseClient
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (existingSubscription) {
        const { error: subscriptionUpdateError } = await supabaseClient
          .from('subscriptions')
          .update(subscriptionData)
          .eq('user_id', userId);
          
        if (subscriptionUpdateError) {
          console.error(`[N8N-SYNC-${requestId}] Subscription update failed:`, subscriptionUpdateError);
        } else {
          console.log(`[N8N-SYNC-${requestId}] Subscription updated for user: ${userId}`);
        }
      } else {
        const { error: subscriptionCreateError } = await supabaseClient
          .from('subscriptions')
          .insert(subscriptionData);
          
        if (subscriptionCreateError) {
          console.error(`[N8N-SYNC-${requestId}] Subscription creation failed:`, subscriptionCreateError);
        } else {
          console.log(`[N8N-SYNC-${requestId}] Subscription created for user: ${userId}`);
        }
      }
      
      // Validate final subscription state
      const { data: finalSubscriptionState } = await supabaseClient
        .rpc('has_active_subscription', { user_id_param: userId });
      
      console.log(`[N8N-SYNC-${requestId}] Final subscription validation:`, { 
        finalSubscriptionState,
        wasActive: hasActiveSubscription,
        nowActive: finalSubscriptionState
      });
      
      processedData = { 
        subscriptionStatus: status, 
        planName: plan_name,
        hasActiveSubscription: finalSubscriptionState,
        subscriptionValidated: true
      };
    }

    // WhatsApp validation endpoint call
    if (type === 'validation' && phone) {
      console.log(`[N8N-SYNC-${requestId}] Processing WhatsApp validation for phone: ${phone}`);
      
      try {
        // Call the external N8N webhook for validation
        const validationResponse = await fetch('https://n8n.poupeizap.com/webhook-test/verifica-zap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + btoa('USUARIO:SENHA')
          },
          body: JSON.stringify({
            phone: phone,
            userId: userId
          })
        });

        if (!validationResponse.ok) {
          throw new Error(`Validation API returned ${validationResponse.status}: ${validationResponse.statusText}`);
        }

        const validationData = await validationResponse.json();
        console.log(`[N8N-SYNC-${requestId}] Validation response:`, validationData);

        if (validationData?.success) {
          // Update profile with validated WhatsApp
          const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({ 
              whatsapp: phone,
              phone: phone,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);
          
          if (updateError) {
            console.error(`[N8N-SYNC-${requestId}] Profile update after validation failed:`, updateError);
          } else {
            console.log(`[N8N-SYNC-${requestId}] Profile updated after WhatsApp validation`);
          }

          processedData = { 
            whatsappValidated: true,
            phone: phone,
            validationData: validationData
          };
        } else {
          processedData = { 
            whatsappValidated: false,
            error: validationData?.error || 'Validation failed'
          };
        }
      } catch (error) {
        console.error(`[N8N-SYNC-${requestId}] WhatsApp validation failed:`, error.message);
        processedData = { 
          whatsappValidated: false,
          error: error.message
        };
      }
    }

    // Health check endpoint
    if (type === 'health_check') {
      console.log(`[N8N-SYNC-${requestId}] Processing health check...`);
      
      const { data: healthData, error: healthError } = await supabaseClient
        .rpc('check_n8n_health');
        
      if (healthError) {
        console.error(`[N8N-SYNC-${requestId}] Health check failed:`, healthError);
        return new Response(JSON.stringify({ 
          error: 'Health check failed',
          details: healthError.message,
          requestId,
          timestamp: new Date().toISOString()
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ 
        success: true,
        health: healthData,
        requestId,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[N8N-SYNC-${requestId}] Operation completed successfully for user: ${userProfile.nome}`);
    
    return new Response(JSON.stringify({ 
      success: true,
      message: `${type || 'Data'} synchronized successfully`,
      userId,
      userName: userProfile.nome,
      requestId,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorId = crypto.randomUUID().substring(0, 8);
    console.error(`[N8N-SYNC-ERROR-${errorId}] Operation failed:`, {
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