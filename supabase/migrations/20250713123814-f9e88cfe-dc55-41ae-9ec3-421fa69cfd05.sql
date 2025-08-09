-- FASE 1: LIMPEZA DOS DADOS DUPLICADOS
-- Remover registros duplicados da tabela user_goals (mantendo o mais recente)
WITH duplicate_goals AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY user_id, month, year ORDER BY updated_at DESC) as rn
  FROM user_goals
)
DELETE FROM user_goals 
WHERE id IN (SELECT id FROM duplicate_goals WHERE rn > 1);

-- Criar constraint UNIQUE para prevenir futuras duplicações
ALTER TABLE user_goals 
ADD CONSTRAINT unique_user_goals_month_year 
UNIQUE (user_id, month, year);

-- FASE 2: CORREÇÃO DOS DADOS DE ASSINATURA
-- Atualizar perfil do usuário para refletir que veio do Asaas (não Perfect Pay)
UPDATE public.profiles 
SET 
  assinaturaid = 'ASA_456789',
  customerid = 'ASA_CUSTOMER_456',
  whatsapp = '+5511999999999',
  phone = '+5511999999999',
  updated_at = NOW()
WHERE id = '24c11d49-12ef-4307-aa1d-0497ef4e4185';

-- Deletar subscription existente para forçar nova sincronização correta
DELETE FROM public.subscriptions 
WHERE user_id = '24c11d49-12ef-4307-aa1d-0497ef4e4185';

-- FASE 3: CRIAÇÃO DE DADOS DE TESTE
-- Inserir transações de exemplo para o usuário
INSERT INTO public.transacoes (userid, category_id, tipo, valor, estabelecimento, detalhes, quando) 
SELECT 
  '24c11d49-12ef-4307-aa1d-0497ef4e4185',
  c.id,
  'despesa',
  150.00,
  'Supermercado ABC',
  'Compras do mês',
  NOW() - INTERVAL '1 day'
FROM public.categorias c 
WHERE c.userid = '24c11d49-12ef-4307-aa1d-0497ef4e4185' 
LIMIT 1;

INSERT INTO public.transacoes (userid, category_id, tipo, valor, estabelecimento, detalhes, quando) 
SELECT 
  '24c11d49-12ef-4307-aa1d-0497ef4e4185',
  c.id,
  'receita',
  3000.00,
  'Salário',
  'Salário mensal',
  NOW() - INTERVAL '2 days'
FROM public.categorias c 
WHERE c.userid = '24c11d49-12ef-4307-aa1d-0497ef4e4185' 
LIMIT 1;

-- Inserir lembretes de exemplo
INSERT INTO public.lembretes (userid, descricao, valor, data, status, icon, is_recurring, repeat_months)
VALUES 
  ('24c11d49-12ef-4307-aa1d-0497ef4e4185', 'Pagamento do cartão de crédito', 500.00, NOW() + INTERVAL '5 days', 'pending', 'credit-card', true, 1),
  ('24c11d49-12ef-4307-aa1d-0497ef4e4185', 'Conta de luz', 120.00, NOW() + INTERVAL '10 days', 'pending', 'zap', true, 1),
  ('24c11d49-12ef-4307-aa1d-0497ef4e4185', 'Aluguel', 1200.00, NOW() + INTERVAL '15 days', 'pending', 'home', true, 1);

-- Inserir meta para o mês atual
INSERT INTO public.user_goals (user_id, month, year, income_goal, expense_limit)
VALUES (
  '24c11d49-12ef-4307-aa1d-0497ef4e4185',
  EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  5000.00,
  4000.00
)
ON CONFLICT (user_id, month, year) DO UPDATE SET
  income_goal = EXCLUDED.income_goal,
  expense_limit = EXCLUDED.expense_limit,
  updated_at = NOW();