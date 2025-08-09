-- Criar dados de assinatura realistas (Asaas)
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

-- Criar dados de teste (transações e lembretes) usando IDs das categorias
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