-- Melhorar RLS policies para Perfect Pay users
-- Adicionar política específica para usuários com Perfect Pay

-- Para tabela subscriptions: permitir acesso para usuários com assinaturaid válido
CREATE POLICY "perfect_pay_users_can_access_subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (
      assinaturaid = 'active' OR 
      assinaturaid LIKE 'pp_%' OR 
      assinaturaid LIKE 'PPSUB%' OR
      (assinaturaid IS NOT NULL AND assinaturaid != '' AND assinaturaid != 'inactive')
    )
  ))
);

-- Para tabela profiles: melhorar política de acesso
DROP POLICY IF EXISTS "active_users_can_access_profile" ON public.profiles;

CREATE POLICY "enhanced_profile_access" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id OR 
  ativo = true OR 
  assinaturaid = 'active' OR 
  assinaturaid LIKE 'pp_%' OR 
  assinaturaid LIKE 'PPSUB%' OR
  (assinaturaid IS NOT NULL AND assinaturaid != '' AND assinaturaid != 'inactive')
);

-- Para outras tabelas: melhorar políticas similares
DROP POLICY IF EXISTS "active_users_can_view_own_transactions" ON public.transacoes;
DROP POLICY IF EXISTS "active_users_can_view_own_categories" ON public.categorias;
DROP POLICY IF EXISTS "active_users_can_view_own_reminders" ON public.lembretes;

CREATE POLICY "enhanced_transactions_access" 
ON public.transacoes 
FOR SELECT 
USING (
  auth.uid() = userid OR 
  (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (
      ativo = true OR 
      assinaturaid = 'active' OR 
      assinaturaid LIKE 'pp_%' OR 
      assinaturaid LIKE 'PPSUB%' OR
      (assinaturaid IS NOT NULL AND assinaturaid != '' AND assinaturaid != 'inactive')
    )
  ))
);

CREATE POLICY "enhanced_categories_access" 
ON public.categorias 
FOR SELECT 
USING (
  auth.uid() = userid OR 
  (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (
      ativo = true OR 
      assinaturaid = 'active' OR 
      assinaturaid LIKE 'pp_%' OR 
      assinaturaid LIKE 'PPSUB%' OR
      (assinaturaid IS NOT NULL AND assinaturaid != '' AND assinaturaid != 'inactive')
    )
  ))
);

CREATE POLICY "enhanced_reminders_access" 
ON public.lembretes 
FOR SELECT 
USING (
  auth.uid() = userid OR 
  (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (
      ativo = true OR 
      assinaturaid = 'active' OR 
      assinaturaid LIKE 'pp_%' OR 
      assinaturaid LIKE 'PPSUB%' OR
      (assinaturaid IS NOT NULL AND assinaturaid != '' AND assinaturaid != 'inactive')
    )
  ))
);