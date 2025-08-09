
-- Corrigir os dados da assinatura do Samuel
UPDATE subscriptions 
SET 
  cycle = 'yearly',
  amount = 5.00,
  next_payment_date = start_date + INTERVAL '12 months',
  plan_name = 'Plano Anual',
  updated_at = now()
WHERE subscription_id = 'PPSUB1O91CFHU' 
  AND user_id = 'ddf661d3-28e3-4b53-8120-3e2f3830a267';
