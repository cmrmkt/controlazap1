-- Corrigir profiles do Perfect Pay existentes
UPDATE public.profiles 
SET assinaturaid = 'pp_' || substring(id::text, 1, 8) || '_' || extract(epoch from now())::bigint,
    updated_at = now()
WHERE assinaturaid = 'active';

-- Criar registros de assinatura para usuários Perfect Pay existentes
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
  card_brand,
  created_at,
  updated_at
)
SELECT 
  p.id,
  p.assinaturaid,
  'active',
  'Perfect Pay - Plano Anual',
  5.00,
  'BRL',
  'yearly',
  p.created_at,
  p.created_at + interval '1 year',
  'credit_card',
  'Perfect Pay',
  now(),
  now()
FROM public.profiles p
WHERE p.assinaturaid LIKE 'pp_%'
AND NOT EXISTS (
  SELECT 1 FROM public.subscriptions s 
  WHERE s.user_id = p.id AND s.subscription_id = p.assinaturaid
);