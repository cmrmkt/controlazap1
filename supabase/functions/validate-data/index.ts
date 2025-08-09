import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  type: 'user' | 'transaction' | 'category';
  data: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let requestData: ValidationRequest;
    try {
      requestData = await req.json();
    } catch (error) {
      return new Response(JSON.stringify({
        valid: false,
        errors: ['Dados inválidos: JSON malformado'],
        code: 'INVALID_JSON'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let validationResult;
    
    switch (requestData.type) {
      case 'user':
        validationResult = await validateUser(supabase, requestData.data);
        break;
      case 'transaction':
        validationResult = await validateTransaction(supabase, requestData.data);
        break;
      case 'category':
        validationResult = await validateCategory(supabase, requestData.data);
        break;
      default:
        return new Response(JSON.stringify({
          valid: false,
          errors: ['Tipo de validação não suportado'],
          code: 'UNSUPPORTED_TYPE'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(validationResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in validate-data:', error);
    return new Response(JSON.stringify({
      valid: false,
      errors: [error.message],
      code: 'INTERNAL_ERROR'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function validateUser(supabase: any, userData: any) {
  const errors: string[] = [];
  
  // Validar formato do UUID se fornecido
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (userData.id && !uuidRegex.test(userData.id)) {
    errors.push('Campo "id" deve ser um UUID válido');
  }
  
  // Validar email se fornecido
  if (userData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
    errors.push('Campo "email" deve ter formato válido');
  }
  
  // Verificar se usuário existe E é assinante ativo
  if (userData.id) {
    // Verificar se usuário é assinante ativo
    const { data: isActiveSubscriber } = await supabase.rpc('is_active_subscriber', {
      user_id: userData.id
    });
    
    if (!isActiveSubscriber) {
      errors.push('Usuário não existe ou não possui assinatura ativa');
    }
  } else {
    errors.push('ID do usuário é obrigatório');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    recommendations: errors.length === 0 ? [] : [
      'Apenas usuários com assinatura ativa podem inserir dados'
    ]
  };
}

async function validateTransaction(supabase: any, transactionData: any) {
  const errors: string[] = [];
  
  // Validar campos obrigatórios
  if (!transactionData.userid || typeof transactionData.userid !== 'string') {
    errors.push('Campo "userid" é obrigatório e deve ser uma string');
  }
  
  if (!transactionData.estabelecimento || typeof transactionData.estabelecimento !== 'string') {
    errors.push('Campo "estabelecimento" é obrigatório e deve ser uma string');
  }
  
  if (typeof transactionData.valor !== 'number' || isNaN(transactionData.valor)) {
    errors.push('Campo "valor" deve ser um número válido');
  }
  
  if (!transactionData.tipo || !['receita', 'despesa'].includes(transactionData.tipo)) {
    errors.push('Campo "tipo" deve ser "receita" ou "despesa"');
  }
  
  // category_id agora é opcional - será criado automaticamente se não fornecido
  if (transactionData.category_id && typeof transactionData.category_id !== 'string') {
    errors.push('Campo "category_id" deve ser uma string se fornecido');
  }
  
  // Validar formato de data
  if (transactionData.quando) {
    const date = new Date(transactionData.quando);
    if (isNaN(date.getTime())) {
      errors.push('Campo "quando" deve ser uma data válida no formato ISO');
    }
  }
  
  // Validar UUID do usuário
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (transactionData.userid && !uuidRegex.test(transactionData.userid)) {
    errors.push('Campo "userid" deve ser um UUID válido');
  }
  
  // Removido - agora aceitamos category_id não-UUID que será usado para criar categoria automaticamente
  
  // Verificar se usuário existe E é assinante ativo
  if (transactionData.userid && uuidRegex.test(transactionData.userid)) {
    const { data: isActiveSubscriber } = await supabase.rpc('is_active_subscriber', {
      user_id: transactionData.userid
    });
    
    if (!isActiveSubscriber) {
      errors.push('Usuário não existe ou não possui assinatura ativa');
    }
  }
  
  // Verificar se categoria existe e é válida
  if (transactionData.category_id && uuidRegex.test(transactionData.category_id)) {
    const { data: category } = await supabase
      .from('categorias')
      .select('id')
      .eq('id', transactionData.category_id)
      .eq('userid', transactionData.userid)
      .single();
    
    if (!category) {
      errors.push('Categoria não existe ou não pertence ao usuário');
    }
  } else if (transactionData.category_id && !uuidRegex.test(transactionData.category_id)) {
    // Se category_id não é um UUID válido, é aceitável (será corrigido automaticamente)
    console.log(`Category_id inválido "${transactionData.category_id}" será usado para criar categoria automaticamente`);
  } else if (!transactionData.category_id && transactionData.userid) {
    // Se não tem categoria, será criada automaticamente
    console.log(`Transação sem categoria para usuário ${transactionData.userid}, categoria padrão será criada automaticamente`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    recommendations: errors.length === 0 ? [] : [
      'Verifique se o usuário existe antes de inserir transações',
      'Use uma categoria padrão se category_id não for fornecido',
      'Sempre envie datas no formato ISO 8601'
    ]
  };
}

async function validateCategory(supabase: any, categoryData: any) {
  const errors: string[] = [];
  
  if (!categoryData.userid || typeof categoryData.userid !== 'string') {
    errors.push('Campo "userid" é obrigatório e deve ser uma string');
  }
  
  if (!categoryData.nome || typeof categoryData.nome !== 'string') {
    errors.push('Campo "nome" é obrigatório e deve ser uma string');
  }
  
  // Validar UUID do usuário
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (categoryData.userid && !uuidRegex.test(categoryData.userid)) {
    errors.push('Campo "userid" deve ser um UUID válido');
  }
  
  // Verificar se usuário existe E é assinante ativo
  if (categoryData.userid && uuidRegex.test(categoryData.userid)) {
    const { data: isActiveSubscriber } = await supabase.rpc('is_active_subscriber', {
      user_id: categoryData.userid
    });
    
    if (!isActiveSubscriber) {
      errors.push('Usuário não existe ou não possui assinatura ativa');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    recommendations: errors.length === 0 ? [] : [
      'Certifique-se de que o usuário existe antes de criar categorias'
    ]
  };
}