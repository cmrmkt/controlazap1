-- Fase 1: Correção dos Dados do Perfil
UPDATE public.profiles 
SET 
  nome = CASE 
    WHEN nome IS NULL OR nome = '' THEN 
      CASE 
        WHEN email IS NOT NULL THEN split_part(email, '@', 1)
        ELSE 'Usuário'
      END
    ELSE nome
  END,
  phone = CASE 
    WHEN phone IS NULL OR phone = '' THEN '+5511999887766'
    ELSE phone
  END,
  whatsapp = CASE 
    WHEN whatsapp IS NULL OR whatsapp = '' THEN '+5511999887766'
    ELSE whatsapp
  END,
  assinaturaid = CASE 
    WHEN assinaturaid IS NULL OR assinaturaid = '' THEN 'PPSUB_BASIC_001'
    ELSE assinaturaid
  END,
  ativo = true,
  updated_at = now()
WHERE id = 'f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c';

-- Fase 2: Criação de Categorias Padrão Essenciais
INSERT INTO public.categorias (nome, tags, userid, created_at, updated_at)
VALUES 
  ('Alimentação', 'comida,supermercado,restaurante', 'f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c', now(), now()),
  ('Transporte', 'combustivel,passagem,uber', 'f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c', now(), now()),
  ('Saúde', 'medico,farmacia,plano', 'f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c', now(), now()),
  ('Casa', 'aluguel,condominio,luz,agua', 'f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c', now(), now()),
  ('Salário', 'trabalho,renda,freelance', 'f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c', now(), now()),
  ('Lazer', 'entretenimento,cinema,viagem', 'f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c', now(), now()),
  ('Educação', 'curso,livro,escola', 'f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c', now(), now()),
  ('Vestuário', 'roupa,calçado,acessorio', 'f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c', now(), now());

-- Fase 3: Criação de Dados de Assinatura Realistas (Asaas)
INSERT INTO public.subscriptions (
  user_id, 
  subscription_id, 
  status, 
  plan_name, 
  amount, 
  currency, 
  cycle, 
  start_date, 
  next_payment_date, 
  payment_method, 
  card_last_four, 
  card_brand,
  created_at, 
  updated_at
)
VALUES (
  'f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c',
  'PPSUB_BASIC_001',
  'active',
  'Plano Básico',
  29.90,
  'BRL',
  'monthly',
  now() - interval '7 days',
  now() + interval '23 days',
  'CREDIT_CARD',
  '4567',
  'visa',
  now(),
  now()
);

-- Fase 4: Criação de Dados de Teste (Transações e Lembretes)
-- Primeiro, vamos obter os IDs das categorias criadas
DO $$
DECLARE
    cat_alimentacao uuid;
    cat_transporte uuid;
    cat_salario uuid;
    cat_casa uuid;
BEGIN
    -- Buscar IDs das categorias
    SELECT id INTO cat_alimentacao FROM categorias WHERE nome = 'Alimentação' AND userid = 'f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c';
    SELECT id INTO cat_transporte FROM categorias WHERE nome = 'Transporte' AND userid = 'f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c';
    SELECT id INTO cat_salario FROM categorias WHERE nome = 'Salário' AND userid = 'f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c';
    SELECT id INTO cat_casa FROM categorias WHERE nome = 'Casa' AND userid = 'f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c';

    -- Criar transações de exemplo
    INSERT INTO public.transacoes (userid, tipo, valor, estabelecimento, detalhes, category_id, quando, created_at)
    VALUES 
      ('f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c', 'receita', 3500.00, 'Empresa ABC', 'Salário mensal', cat_salario, current_date - interval '5 days', now() - interval '5 days'),
      ('f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c', 'despesa', 85.50, 'Supermercado Extra', 'Compras da semana', cat_alimentacao, current_date - interval '3 days', now() - interval '3 days'),
      ('f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c', 'despesa', 1200.00, 'Imobiliária Central', 'Aluguel do mês', cat_casa, current_date - interval '2 days', now() - interval '2 days'),
      ('f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c', 'despesa', 45.00, 'Posto Ipiranga', 'Combustível', cat_transporte, current_date - interval '1 day', now() - interval '1 day');

    -- Criar lembretes de exemplo
    INSERT INTO public.lembretes (userid, descricao, valor, data, status, icon, is_recurring, repeat_months, created_at)
    VALUES 
      ('f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c', 'Pagamento do aluguel', 1200.00, current_date + interval '25 days', 'pending', 'home', true, 1, now()),
      ('f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c', 'Fatura do cartão de crédito', 850.00, current_date + interval '15 days', 'pending', 'credit-card', true, 1, now()),
      ('f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c', 'Consulta médica', 150.00, current_date + interval '7 days', 'pending', 'heart', false, null, now());

    -- Criar metas financeiras
    INSERT INTO public.user_goals (user_id, month, year, income_goal, expense_limit, created_at, updated_at)
    VALUES 
      ('f63ea00f-8d0d-48e0-9eb4-3ed4b63b1e3c', EXTRACT(MONTH FROM current_date)::integer, EXTRACT(YEAR FROM current_date)::integer, 4000.00, 3000.00, now(), now());
END $$;