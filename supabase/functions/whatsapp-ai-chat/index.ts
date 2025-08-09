import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransactionData {
  estabelecimento: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  detalhes: string;
  quando: string;
  category_id?: string;
}

// Função para validar dados de entrada
function validateRequestData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.message || typeof data.message !== 'string') {
    errors.push('Campo "message" é obrigatório e deve ser uma string');
  }
  
  if (!data.phone || typeof data.phone !== 'string') {
    errors.push('Campo "phone" é obrigatório e deve ser uma string');
  }
  
  if (!data.userId || typeof data.userId !== 'string') {
    errors.push('Campo "userId" é obrigatório e deve ser uma string');
  }
  
  // Validar se userId é um UUID válido
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (data.userId && !uuidRegex.test(data.userId)) {
    errors.push('Campo "userId" deve ser um UUID válido');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Função para validar dados de transação
function validateTransactionData(data: TransactionData): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.estabelecimento || typeof data.estabelecimento !== 'string') {
    errors.push('Campo "estabelecimento" é obrigatório e deve ser uma string');
  }
  
  if (typeof data.valor !== 'number' || isNaN(data.valor)) {
    errors.push('Campo "valor" deve ser um número válido');
  }
  
  if (!data.tipo || !['receita', 'despesa'].includes(data.tipo)) {
    errors.push('Campo "tipo" deve ser "receita" ou "despesa"');
  }
  
  if (!data.quando || typeof data.quando !== 'string') {
    errors.push('Campo "quando" é obrigatório e deve ser uma string de data válida');
  } else {
    // Validar se é uma data válida
    const date = new Date(data.quando);
    if (isNaN(date.getTime())) {
      errors.push('Campo "quando" deve ser uma data válida no formato ISO');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY não configurado');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse and validate request data
    let requestData;
    try {
      requestData = await req.json();
    } catch (error) {
      console.error('Invalid JSON in request body:', error);
      return new Response(JSON.stringify({ 
        error: 'Dados inválidos: JSON malformado',
        code: 'INVALID_JSON'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate request data
    const validation = validateRequestData(requestData);
    if (!validation.isValid) {
      console.error('Request validation failed:', validation.errors);
      return new Response(JSON.stringify({ 
        error: 'Dados de entrada inválidos',
        details: validation.errors,
        code: 'VALIDATION_ERROR'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, phone, userId } = requestData;

    console.log('Received message:', { message, phone, userId });

    // Check if it's a reminder request
    if (isReminderRequest(message)) {
      console.log('Detected reminder request');
      const remindersResponse = await handleReminderRequest(supabase, userId);
      
      // Save conversation for reminder request
      await saveConversation(supabase, userId, message, remindersResponse);
      
      // Send WhatsApp message
      await sendWhatsAppMessage(phone, remindersResponse);
      
      return new Response(JSON.stringify({
        success: true,
        response: remindersResponse,
        type: 'reminder'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user data and financial information
    const userData = await getUserFinancialData(supabase, userId);
    
    // Process message with OpenAI
    const aiResponse = await processMessageWithAI(message, userData, openaiApiKey);
    
    // Check if the message contains a transaction to be added
    const transactionData = await extractTransactionFromMessage(message, aiResponse.content, openaiApiKey);
    
    if (transactionData) {
      // Validar dados da transação antes de inserir
      const transactionValidation = validateTransactionData(transactionData);
      if (!transactionValidation.isValid) {
        console.error('Transaction validation failed:', transactionValidation.errors);
        return new Response(JSON.stringify({ 
          error: 'Dados da transação inválidos',
          details: transactionValidation.errors,
          code: 'TRANSACTION_VALIDATION_ERROR'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      await addTransactionToDatabase(supabase, userId, transactionData);
    }

    // Save conversation to database
    await saveConversation(supabase, userId, message, aiResponse.content);

    // Send WhatsApp message (placeholder - integrate with your WhatsApp service)
    await sendWhatsAppMessage(phone, aiResponse.content);

    return new Response(JSON.stringify({ 
      success: true, 
      response: aiResponse.content,
      transactionAdded: !!transactionData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in whatsapp-ai-chat:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getUserFinancialData(supabase: any, userId: string) {
  try {
    // Get user's recent transactions
    const { data: transactions } = await supabase
      .from('transacoes')
      .select(`
        *,
        categorias!transacoes_category_id_fkey (
          id,
          nome
        )
      `)
      .eq('userid', userId)
      .gte('quando', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .order('quando', { ascending: false })
      .limit(50);

    // Get user's categories
    const { data: categories } = await supabase
      .from('categorias')
      .select('*')
      .eq('userid', userId);

    // Get user's reminders
    const { data: reminders } = await supabase
      .from('lembretes')
      .select('*')
      .eq('userid', userId)
      .gte('data', new Date().toISOString().split('T')[0]) // Future reminders
      .order('data', { ascending: true })
      .limit(10);

    // Calculate financial summary
    const receitas = transactions?.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + (t.valor || 0), 0) || 0;
    const despesas = transactions?.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + Math.abs(t.valor || 0), 0) || 0;
    const saldo = receitas - despesas;

    return {
      transactions: transactions || [],
      categories: categories || [],
      reminders: reminders || [],
      summary: {
        receitas,
        despesas,
        saldo,
        transactionCount: transactions?.length || 0
      }
    };
  } catch (error) {
    console.error('Error getting user financial data:', error);
    return {
      transactions: [],
      categories: [],
      reminders: [],
      summary: { receitas: 0, despesas: 0, saldo: 0, transactionCount: 0 }
    };
  }
}

async function processMessageWithAI(message: string, userData: any, openaiApiKey: string) {
  const systemPrompt = `Você é um assistente financeiro pessoal inteligente e amigável. Sua função é ajudar o usuário com suas finanças pessoais.

DADOS FINANCEIROS DO USUÁRIO:
- Receitas últimos 30 dias: R$ ${userData.summary.receitas.toFixed(2)}
- Despesas últimos 30 dias: R$ ${userData.summary.despesas.toFixed(2)}
- Saldo atual: R$ ${userData.summary.saldo.toFixed(2)}
- Total de transações: ${userData.summary.transactionCount}

CATEGORIAS DISPONÍVEIS:
${userData.categories.map((cat: any) => `- ${cat.nome}`).join('\n')}

LEMBRETES PENDENTES:
${userData.reminders.map((rem: any) => `- ${rem.descricao} (${rem.data})`).join('\n')}

ÚLTIMAS TRANSAÇÕES:
${userData.transactions.slice(0, 10).map((t: any) => 
  `- ${t.estabelecimento || 'N/A'}: R$ ${Math.abs(t.valor || 0).toFixed(2)} (${t.tipo}) - ${t.categorias?.nome || 'Sem categoria'}`
).join('\n')}

INSTRUÇÕES:
1. Responda de forma concisa e amigável (máximo 2-3 frases)
2. Use emojis quando apropriado
3. Se o usuário mencionar uma transação (ex: "gastei R$ 50 no almoço"), confirme que você entendeu mas NÃO adicione automaticamente
4. Para consultas sobre gastos, use os dados reais fornecidos
5. Seja proativo em dar dicas financeiras quando relevante
6. Use formatação brasileira para valores (R$ X,XX)

Responda sempre em português brasileiro e de forma natural, como se fosse uma conversa no WhatsApp.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    return data.choices[0].message;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return { 
      content: 'Desculpe, não consegui processar sua mensagem no momento. Tente novamente em alguns minutos. 😊' 
    };
  }
}

async function extractTransactionFromMessage(userMessage: string, aiResponse: string, openaiApiKey: string) {
  // Check if the message likely contains a transaction
  const transactionKeywords = ['gastei', 'paguei', 'comprei', 'recebi', 'ganhei', 'r$', 'reais'];
  const hasTransactionKeyword = transactionKeywords.some(keyword => 
    userMessage.toLowerCase().includes(keyword)
  );

  if (!hasTransactionKeyword) {
    return null;
  }

  const extractPrompt = `Analise a seguinte mensagem e extraia APENAS os dados de transação financeira, se houver uma transação clara e específica:

MENSAGEM: "${userMessage}"

Se houver uma transação clara, responda APENAS com um JSON válido no formato:
{
  "estabelecimento": "nome do local/descrição",
  "valor": valor_numerico_positivo,
  "tipo": "receita" ou "despesa",
  "detalhes": "detalhes adicionais",
  "quando": "data em formato ISO (hoje se não especificado)"
}

Se NÃO houver uma transação específica e clara, responda apenas: null

IMPORTANTE: 
- Só extraia se for uma transação ESPECÍFICA (ex: "gastei R$ 25 no almoço")
- NÃO extraia para perguntas gerais (ex: "quanto gastei este mês?")
- Use valor sempre positivo
- Data padrão é hoje se não especificada`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você é um extrator de dados financeiros. Responda APENAS com JSON válido ou null.' },
          { role: 'user', content: extractPrompt }
        ],
        max_tokens: 150,
        temperature: 0.1,
      }),
    });

    const data = await response.json();
    const result = data.choices[0].message.content.trim();
    
    if (result === 'null' || result === null) {
      return null;
    }

    try {
      return JSON.parse(result);
    } catch {
      return null;
    }
  } catch (error) {
    console.error('Error extracting transaction:', error);
    return null;
  }
}

async function addTransactionToDatabase(supabase: any, userId: string, transactionData: TransactionData) {
  try {
    console.log(`Iniciando inserção de transação para usuário: ${userId}`);
    console.log('Dados da transação recebidos:', JSON.stringify(transactionData, null, 2));
    
    // Verificar se usuário é assinante ativo
    const { data: isActiveSubscriber } = await supabase.rpc('is_active_subscriber', {
      user_id: userId
    });

    if (!isActiveSubscriber) {
      console.error(`Usuário ${userId} não é assinante ativo`);
      throw new Error('Usuário não possui assinatura ativa');
    }

    console.log(`Usuário ${userId} confirmado como assinante ativo`);

    // Buscar ou criar categoria válida para o usuário
    let categoryId = await getValidCategoryId(supabase, userId, transactionData.category_id, transactionData.estabelecimento);
    
    if (!categoryId) {
      console.error('Falha ao obter categoria válida para a transação');
      throw new Error('Não foi possível obter uma categoria válida');
    }

    console.log(`Categoria válida obtida: ${categoryId}`);

    // Inserir a transação
    const transactionToInsert = {
      userid: userId,
      estabelecimento: transactionData.estabelecimento,
      valor: transactionData.tipo === 'despesa' ? -Math.abs(transactionData.valor) : Math.abs(transactionData.valor),
      tipo: transactionData.tipo,
      detalhes: transactionData.detalhes,
      quando: transactionData.quando,
      category_id: categoryId,
      created_at: new Date().toISOString()
    };

    console.log('Dados a serem inseridos na tabela transacoes:', JSON.stringify(transactionToInsert, null, 2));

    const { data: insertedTransaction, error } = await supabase
      .from('transacoes')
      .insert(transactionToInsert)
      .select()
      .single();

    if (error) {
      console.error('Erro ao inserir transação:', error);
      console.error('Detalhes do erro:', JSON.stringify(error, null, 2));
      throw new Error(`Falha ao inserir transação: ${error.message}`);
    } else {
      console.log('Transação inserida com sucesso!');
      console.log('Transação criada:', JSON.stringify(insertedTransaction, null, 2));
    }
  } catch (error) {
    console.error('Erro crítico em addTransactionToDatabase:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Função para obter uma categoria válida (criar se necessário)
async function getValidCategoryId(supabase: any, userId: string, providedCategoryId?: string, estabelecimento?: string): Promise<string | null> {
  try {
    // Validar UUID do category_id fornecido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    // Se category_id foi fornecido e é um UUID válido, verificar se existe
    if (providedCategoryId && uuidRegex.test(providedCategoryId)) {
      const { data: existingCategory } = await supabase
        .from('categorias')
        .select('id')
        .eq('id', providedCategoryId)
        .eq('userid', userId)
        .single();
      
      if (existingCategory) {
        console.log(`Categoria existente encontrada: ${providedCategoryId}`);
        return providedCategoryId;
      }
    }

    // Se category_id não é válido ou não existe, buscar categoria padrão do usuário
    console.log('Category_id inválido ou inexistente, buscando categoria padrão...');
    
    const { data: userCategories } = await supabase
      .from('categorias')
      .select('id, nome')
      .eq('userid', userId)
      .limit(1);
    
    if (userCategories && userCategories.length > 0) {
      console.log(`Categoria padrão do usuário encontrada: ${userCategories[0].id}`);
      return userCategories[0].id;
    }

    // Se usuário não tem categorias, criar uma categoria padrão
    console.log('Usuário não possui categorias, criando categoria padrão...');
    
    const categoryName = providedCategoryId && typeof providedCategoryId === 'string' 
      ? providedCategoryId.substring(0, 50) // Usar o valor fornecido como nome se não for UUID
      : estabelecimento || 'Geral';

    const { data: newCategory, error: categoryError } = await supabase
      .from('categorias')
      .insert({
        userid: userId,
        nome: categoryName,
        tags: 'auto-created'
      })
      .select('id')
      .single();
    
    if (categoryError) {
      console.error('Erro ao criar categoria padrão:', categoryError);
      return null;
    }

    console.log(`Nova categoria criada: ${newCategory.id} com nome: ${categoryName}`);
    return newCategory.id;
    
  } catch (error) {
    console.error('Erro em getValidCategoryId:', error);
    return null;
  }
}

async function saveConversation(supabase: any, userId: string, message: string, response: string) {
  try {
    // In a real implementation, you'd save to a conversations table
    console.log('Saving conversation:', { userId, message, response });
  } catch (error) {
    console.error('Error saving conversation:', error);
  }
}

// Função para detectar solicitações de lembretes
function isReminderRequest(message: string): boolean {
  const keywords = ['lembrete', 'lembretes', 'meus lembretes', 'agenda', 'compromissos', 'agendado', 'compromisso'];
  const messageText = message.toLowerCase();
  return keywords.some(keyword => messageText.includes(keyword));
}

// Função para buscar lembretes do usuário
async function getUserReminders(supabase: any, userId: string) {
  try {
    const { data: lembretes } = await supabase
      .from('lembretes')
      .select('id, descricao, data, valor')
      .eq('userid', userId)
      .gte('data', new Date().toISOString().split('T')[0]) // Apenas lembretes futuros
      .order('data', { ascending: true });
    
    return lembretes || [];
  } catch (error) {
    console.error('Erro ao buscar lembretes:', error);
    return [];
  }
}

// Função para gerar link do Google Calendar
function generateGoogleCalendarLink(lembrete: any): string {
  try {
    const titulo = encodeURIComponent(`Lembrete: ${lembrete.descricao}`);
    const detalhes = lembrete.valor 
      ? encodeURIComponent(`Valor: R$ ${Number(lembrete.valor).toFixed(2)}`)
      : encodeURIComponent('Lembrete agendado via WhatsApp');
    
    // Converter data para formato Google Calendar (YYYYMMDDTHHMMSSZ)
    const dataLembrete = new Date(lembrete.data);
    const dataInicio = dataLembrete.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    // Adicionar 1 hora para data fim
    const dataFim = new Date(dataLembrete.getTime() + 60 * 60 * 1000)
      .toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titulo}&dates=${dataInicio}/${dataFim}&details=${detalhes}&sf=true&output=xml`;
  } catch (error) {
    console.error('Erro ao gerar link Google Calendar:', error);
    return 'https://calendar.google.com/calendar';
  }
}

// Função para formatar data brasileira
function formatDateBrazilian(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return dateString;
  }
}

// Função principal para lidar com solicitações de lembretes
async function handleReminderRequest(supabase: any, userId: string): Promise<string> {
  try {
    const lembretes = await getUserReminders(supabase, userId);
    
    if (lembretes.length === 0) {
      return `📋 *Seus lembretes*

Você ainda não possui lembretes cadastrados na sua conta.

💡 Você pode adicionar lembretes através da sua dashboard no app!`;
    }

    let response = `📋 *Seus próximos lembretes:*\n\n`;
    
    lembretes.forEach((lembrete: any, index: number) => {
      const dataFormatada = formatDateBrazilian(lembrete.data);
      const valor = lembrete.valor ? `💰 R$ ${Number(lembrete.valor).toFixed(2)}` : '';
      const googleLink = generateGoogleCalendarLink(lembrete);
      
      response += `📝 *${lembrete.descricao}*\n`;
      response += `📅 ${dataFormatada}\n`;
      if (valor) response += `${valor}\n`;
      response += `📌 [Adicionar à Google Agenda](${googleLink})\n\n`;
    });
    
    response += `✅ Total: ${lembretes.length} lembrete${lembretes.length > 1 ? 's' : ''} encontrado${lembretes.length > 1 ? 's' : ''}`;
    
    return response;
  } catch (error) {
    console.error('Erro ao processar solicitação de lembretes:', error);
    return `❌ Ops! Houve um erro ao buscar seus lembretes. Tente novamente em alguns minutos.`;
  }
}

async function sendWhatsAppMessage(phone: string, message: string) {
  try {
    // This is a placeholder for WhatsApp integration
    // You would integrate with WhatsApp Business API, Twilio, or another service
    console.log(`Sending WhatsApp message to ${phone}: ${message}`);
    
    // Example with existing n8n webhook (if available)
    const webhookUrl = 'https://n8n.poupae.online/webhook/send-whatsapp';
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa('USUARIO:SENHA')
      },
      body: JSON.stringify({
        phone: phone,
        message: message
      })
    });

    if (!response.ok) {
      console.log('WhatsApp webhook not available, message would be sent to:', phone);
    }
  } catch (error) {
    console.log('WhatsApp integration not configured, message would be sent to:', phone);
  }
}