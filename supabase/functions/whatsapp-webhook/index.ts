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
    console.log('WhatsApp webhook received:', body);

    // Parse WhatsApp webhook payload (format depends on your WhatsApp provider)
    const { from, body: messageBody, timestamp } = body;

    if (!from || !messageBody) {
      console.log('Invalid webhook payload');
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find user by phone number or create if doesn't exist
    let userId = null;
    
    // First try to find existing user
    const { data: phoneVerification } = await supabase
      .from('phone_verifications')
      .select('user_id')
      .eq('phone', from)
      .eq('verified', true)
      .single();

    if (phoneVerification) {
      userId = phoneVerification.user_id;
      console.log('Found existing user for phone:', from);
    } else {
      console.log('Phone number not found, creating new user:', from);
      
      // Create new user using our webhook registration function
      const { data: newUserResult, error: createError } = await supabase.rpc(
        'find_or_create_user_by_contact',
        {
          contact_info: from,
          contact_type: 'phone',
          user_name: `WhatsApp User ${from.slice(-4)}`
        }
      );

      if (createError || !newUserResult.success) {
        console.error('Error creating user:', createError || newUserResult.error);
        return new Response(JSON.stringify({ 
          error: 'Falha ao criar usuário',
          details: createError?.message || newUserResult.error
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      userId = newUserResult.user_id;
      console.log('Created new user:', userId);
    }

    // Process the message with AI
    const { data, error } = await supabase.functions.invoke('whatsapp-ai-chat', {
      body: {
        message: messageBody,
        phone: from,
        userId: userId
      }
    });

    if (error) {
      console.error('Error processing message with AI:', error);
      return new Response(JSON.stringify({ error: 'Failed to process message' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Message processed successfully:', data);

    return new Response(JSON.stringify({ 
      success: true,
      processed: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in whatsapp-webhook:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});