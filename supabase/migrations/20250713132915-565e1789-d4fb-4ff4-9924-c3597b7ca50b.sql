-- Etapa 1: Corrigir RLS para Sincronização Adequada
-- Remover políticas complicadas e simplificar

-- 1. Simplificar políticas de categorias
DROP POLICY IF EXISTS "authenticated_users_can_view_own_categories" ON public.categorias;
DROP POLICY IF EXISTS "authenticated_users_can_insert_own_categories" ON public.categorias;
DROP POLICY IF EXISTS "authenticated_users_can_update_own_categories" ON public.categorias;
DROP POLICY IF EXISTS "authenticated_users_can_delete_own_categories" ON public.categorias;

-- 2. Simplificar políticas de transações  
DROP POLICY IF EXISTS "authenticated_users_can_view_own_transactions" ON public.transacoes;
DROP POLICY IF EXISTS "authenticated_users_can_insert_own_transactions" ON public.transacoes;
DROP POLICY IF EXISTS "authenticated_users_can_update_own_transactions" ON public.transacoes;
DROP POLICY IF EXISTS "authenticated_users_can_delete_own_transactions" ON public.transacoes;

-- 3. Simplificar políticas de lembretes
DROP POLICY IF EXISTS "authenticated_users_can_view_own_reminders" ON public.lembretes;
DROP POLICY IF EXISTS "authenticated_users_can_insert_own_reminders" ON public.lembretes;
DROP POLICY IF EXISTS "authenticated_users_can_update_own_reminders" ON public.lembretes;
DROP POLICY IF EXISTS "authenticated_users_can_delete_own_reminders" ON public.lembretes;

-- 4. Simplificar políticas de user_goals
DROP POLICY IF EXISTS "authenticated_users_can_view_own_goals" ON public.user_goals;
DROP POLICY IF EXISTS "authenticated_users_can_insert_own_goals" ON public.user_goals;
DROP POLICY IF EXISTS "authenticated_users_can_update_own_goals" ON public.user_goals;
DROP POLICY IF EXISTS "authenticated_users_can_delete_own_goals" ON public.user_goals;

-- 5. Simplificar políticas de subscriptions
DROP POLICY IF EXISTS "authenticated_users_can_view_own_subscriptions" ON public.subscriptions;

-- Etapa 2: Configurar REPLICA IDENTITY FULL para realtime
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.transacoes REPLICA IDENTITY FULL;
ALTER TABLE public.lembretes REPLICA IDENTITY FULL;
ALTER TABLE public.categorias REPLICA IDENTITY FULL;
ALTER TABLE public.user_goals REPLICA IDENTITY FULL;
ALTER TABLE public.subscriptions REPLICA IDENTITY FULL;

-- Etapa 3: Consolidar usuários duplicados
-- Transferir dados do usuário duplicado (90bf152a-cccb-4a8e-b359-58d8d1f1ae9f) para o principal (887edf71-d4c1-4679-96f6-93bf047a9714)

-- Atualizar profile principal com informações de subscription do duplicado se necessário
UPDATE public.profiles 
SET 
  assinaturaid = COALESCE(assinaturaid, (
    SELECT assinaturaid FROM public.profiles 
    WHERE id = '90bf152a-cccb-4a8e-b359-58d8d1f1ae9f'
  )),
  subscription_status = COALESCE(subscription_status, (
    SELECT subscription_status FROM public.profiles 
    WHERE id = '90bf152a-cccb-4a8e-b359-58d8d1f1ae9f'
  ))
WHERE id = '887edf71-d4c1-4679-96f6-93bf047a9714';

-- Mover subscriptions do usuário duplicado para o principal
UPDATE public.subscriptions 
SET user_id = '887edf71-d4c1-4679-96f6-93bf047a9714'
WHERE user_id = '90bf152a-cccb-4a8e-b359-58d8d1f1ae9f';

-- Mover transações do usuário duplicado para o principal
UPDATE public.transacoes 
SET userid = '887edf71-d4c1-4679-96f6-93bf047a9714'
WHERE userid = '90bf152a-cccb-4a8e-b359-58d8d1f1ae9f';

-- Mover lembretes do usuário duplicado para o principal
UPDATE public.lembretes 
SET userid = '887edf71-d4c1-4679-96f6-93bf047a9714'
WHERE userid = '90bf152a-cccb-4a8e-b359-58d8d1f1ae9f';

-- Mover categorias do usuário duplicado para o principal
UPDATE public.categorias 
SET userid = '887edf71-d4c1-4679-96f6-93bf047a9714'
WHERE userid = '90bf152a-cccb-4a8e-b359-58d8d1f1ae9f';

-- Mover goals do usuário duplicado para o principal
UPDATE public.user_goals 
SET user_id = '887edf71-d4c1-4679-96f6-93bf047a9714'
WHERE user_id = '90bf152a-cccb-4a8e-b359-58d8d1f1ae9f';

-- Remover usuário duplicado
DELETE FROM public.profiles WHERE id = '90bf152a-cccb-4a8e-b359-58d8d1f1ae9f';

-- Etapa 4: Criar função para validar subscription ativa
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = user_id_param AND status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id_param 
    AND (
      assinaturaid = 'active' 
      OR assinaturaid LIKE 'pp_%' 
      OR assinaturaid LIKE 'PPSUB%'
      OR (assinaturaid IS NOT NULL AND assinaturaid != '' AND assinaturaid != 'inactive' AND assinaturaid != 'no-subscription')
    )
  );
$$;