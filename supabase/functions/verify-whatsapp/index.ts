import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, code, userId } = await req.json();

    if (!phone || !userId) {
      return new Response(JSON.stringify({ error: "Phone e userId são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const username = Deno.env.get('CONTROLZAP_BASIC_USERNAME') ?? '';
    const password = Deno.env.get('CONTROLZAP_BASIC_PASSWORD') ?? '';

    if (!username || !password) {
      return new Response(JSON.stringify({ error: "Segredos de autenticação não configurados" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = 'https://webhook.controlazap.site/webhook/verifica-zap';
    const payload: Record<string, unknown> = { phone, userId };
    if (code) payload.code = code;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${username}:${password}`),
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data?.error || response.statusText }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('verify-whatsapp error:', error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});