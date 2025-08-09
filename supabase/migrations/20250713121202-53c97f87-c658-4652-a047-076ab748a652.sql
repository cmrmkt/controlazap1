-- Correção completa das políticas RLS
-- Fase 1: Ativar RLS nas tabelas faltantes
ALTER TABLE public.system_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Fase 2: Criar função auxiliar para verificação de admin (evita recursão)
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Use consulta direta sem RLS para evitar recursão
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND COALESCE(is_admin, false) = true
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Fase 3: Remover todas as políticas existentes problemáticas
DROP POLICY IF EXISTS "enhanced_profile_access" ON public.profiles;
DROP POLICY IF EXISTS "enhanced_transactions_access" ON public.transacoes;
DROP POLICY IF EXISTS "enhanced_categories_access" ON public.categorias;
DROP POLICY IF EXISTS "enhanced_reminders_access" ON public.lembretes;
DROP POLICY IF EXISTS "perfect_pay_users_can_access_subscriptions" ON public.subscriptions;

-- Fase 4: Criar políticas simples e seguras para PROFILES
CREATE POLICY "users_can_view_own_profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Fase 5: Criar políticas simples e seguras para CATEGORIAS
CREATE POLICY "users_can_view_own_categories" 
ON public.categorias 
FOR SELECT 
TO authenticated 
USING (auth.uid() = userid);

CREATE POLICY "users_can_insert_own_categories" 
ON public.categorias 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = userid);

CREATE POLICY "users_can_update_own_categories" 
ON public.categorias 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = userid) 
WITH CHECK (auth.uid() = userid);

CREATE POLICY "users_can_delete_own_categories" 
ON public.categorias 
FOR DELETE 
TO authenticated 
USING (auth.uid() = userid);

-- Fase 6: Criar políticas simples e seguras para TRANSAÇÕES
CREATE POLICY "users_can_view_own_transactions" 
ON public.transacoes 
FOR SELECT 
TO authenticated 
USING (auth.uid() = userid);

CREATE POLICY "users_can_insert_own_transactions" 
ON public.transacoes 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = userid);

CREATE POLICY "users_can_update_own_transactions" 
ON public.transacoes 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = userid) 
WITH CHECK (auth.uid() = userid);

CREATE POLICY "users_can_delete_own_transactions" 
ON public.transacoes 
FOR DELETE 
TO authenticated 
USING (auth.uid() = userid);

-- Fase 7: Criar políticas simples e seguras para LEMBRETES
CREATE POLICY "users_can_view_own_reminders" 
ON public.lembretes 
FOR SELECT 
TO authenticated 
USING (auth.uid() = userid);

CREATE POLICY "users_can_insert_own_reminders" 
ON public.lembretes 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = userid);

CREATE POLICY "users_can_update_own_reminders" 
ON public.lembretes 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = userid) 
WITH CHECK (auth.uid() = userid);

CREATE POLICY "users_can_delete_own_reminders" 
ON public.lembretes 
FOR DELETE 
TO authenticated 
USING (auth.uid() = userid);

-- Fase 8: Criar políticas simples e seguras para USER_GOALS
CREATE POLICY "users_can_view_own_goals" 
ON public.user_goals 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_goals" 
ON public.user_goals 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_goals" 
ON public.user_goals 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_delete_own_goals" 
ON public.user_goals 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Fase 9: Criar políticas simples e seguras para SUBSCRIPTIONS
CREATE POLICY "users_can_view_own_subscriptions" 
ON public.subscriptions 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Fase 10: Criar políticas para SYSTEM_AUDIT (apenas admins)
CREATE POLICY "only_admins_can_view_audit" 
ON public.system_audit 
FOR SELECT 
TO authenticated 
USING (public.is_user_admin());

CREATE POLICY "only_admins_can_insert_audit" 
ON public.system_audit 
FOR INSERT 
TO authenticated 
WITH CHECK (public.is_user_admin());

-- Fase 11: Criar políticas para SYSTEM_CONFIG
CREATE POLICY "users_can_view_public_config" 
ON public.system_config 
FOR SELECT 
TO authenticated 
USING (COALESCE(is_public, false) = true);

CREATE POLICY "only_admins_can_manage_config" 
ON public.system_config 
FOR ALL 
TO authenticated 
USING (public.is_user_admin()) 
WITH CHECK (public.is_user_admin());

-- Manter políticas do service_role para operações do sistema
-- (estas já existem e devem permanecer)