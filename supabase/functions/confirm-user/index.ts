import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmUserRequest {
  email: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = (await req.json()) as ConfirmUserRequest;
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email inválido" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      console.error("Missing SUPABASE env vars in confirm-user function");
      return new Response(JSON.stringify({ error: "Configuração do servidor ausente" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 1) Buscar usuário pelo email usando a API Admin do GoTrue
    const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}` , {
      method: "GET",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
        "Content-Type": "application/json",
      },
    });

    if (!listRes.ok) {
      const text = await listRes.text();
      console.error("Failed to list users:", listRes.status, text);
      return new Response(JSON.stringify({ error: "Falha ao localizar usuário" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const listJson: any = await listRes.json();
    const user = Array.isArray(listJson) ? listJson[0] : listJson?.users?.[0];

    if (!user?.id) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Se já estiver confirmado, não fazer nada
    if (user?.email_confirmed_at) {
      return new Response(JSON.stringify({ success: true, alreadyConfirmed: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 2) Confirmar o usuário via PATCH
    const confirmRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email_confirm: true }),
    });

    if (!confirmRes.ok) {
      const text = await confirmRes.text();
      console.error("Failed to confirm user:", confirmRes.status, text);
      return new Response(JSON.stringify({ error: "Falha ao confirmar usuário" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const confirmedUser = await confirmRes.json();
    return new Response(JSON.stringify({ success: true, userId: confirmedUser?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("confirm-user error", err?.message || err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
