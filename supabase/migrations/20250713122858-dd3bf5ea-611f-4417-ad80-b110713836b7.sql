-- Atualizar dados do usuário para teste de sincronização
UPDATE public.profiles 
SET 
  assinaturaid = 'pp_test_123',
  customerid = 'PP_CUSTOMER_456',
  updated_at = NOW()
WHERE id = '24c11d49-12ef-4307-aa1d-0497ef4e4185';

-- Deletar subscription existente para forçar nova sincronização
DELETE FROM public.subscriptions 
WHERE user_id = '24c11d49-12ef-4307-aa1d-0497ef4e4185';