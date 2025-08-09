import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MIGRATE-SUBSCRIPTION-DATA] ${step}${detailsStr}`);
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
    logStep("Migration started");

    // Buscar todos os usuários com assinaturaid válidos mas sem registro na tabela subscriptions
    const { data: usersToMigrate, error: usersError } = await supabaseClient
      .from('profiles')
      .select('id, assinaturaid, email, nome')
      .not('assinaturaid', 'is', null)
      .neq('assinaturaid', '')
      .neq('assinaturaid', 'inactive')
      .neq('assinaturaid', 'no-subscription');

    if (usersError) {
      throw new Error(`Error fetching users: ${usersError.message}`);
    }

    logStep("Found users to potentially migrate", { count: usersToMigrate?.length || 0 });

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of usersToMigrate || []) {
      try {
        // Verificar se já existe registro na tabela subscriptions
        const { data: existingSubscription } = await supabaseClient
          .from('subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('subscription_id', user.assinaturaid)
          .maybeSingle();

        if (existingSubscription) {
          logStep("User already has subscription record, skipping", { 
            userId: user.id, 
            email: user.email 
          });
          skippedCount++;
          continue;
        }

        // Determinar se é Perfect Pay
        const isPerfectPay = user.assinaturaid === 'active' || 
                            user.assinaturaid.startsWith('pp_') || 
                            user.assinaturaid.startsWith('PPSUB');

        logStep("Processing user", { 
          userId: user.id, 
          email: user.email, 
          assinaturaid: user.assinaturaid,
          isPerfectPay 
        });

        const currentDate = new Date().toISOString();
        let subscriptionData;

        if (isPerfectPay) {
          // Dados para Perfect Pay
          subscriptionData = {
            user_id: user.id,
            subscription_id: user.assinaturaid,
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
        } else {
          // Dados para Asaas (assumindo plano anual ativo)
          subscriptionData = {
            user_id: user.id,
            subscription_id: user.assinaturaid,
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
        }

        // Inserir registro na tabela subscriptions
        const { error: insertError } = await supabaseClient
          .from('subscriptions')
          .insert(subscriptionData);

        if (insertError) {
          logStep("Error inserting subscription", { 
            userId: user.id, 
            error: insertError.message 
          });
          errorCount++;
        } else {
          logStep("Successfully migrated user", { 
            userId: user.id, 
            email: user.email 
          });
          migratedCount++;
        }

        // Pequeno delay para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (userError: any) {
        logStep("Error processing user", { 
          userId: user.id, 
          error: userError.message 
        });
        errorCount++;
      }
    }

    const result = {
      success: true,
      summary: {
        totalProcessed: usersToMigrate?.length || 0,
        migrated: migratedCount,
        skipped: skippedCount,
        errors: errorCount
      },
      message: `Migration completed: ${migratedCount} migrated, ${skippedCount} skipped, ${errorCount} errors`
    };

    logStep("Migration completed", result.summary);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in migration", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});