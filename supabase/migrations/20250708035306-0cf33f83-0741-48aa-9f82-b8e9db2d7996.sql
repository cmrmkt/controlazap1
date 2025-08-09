-- =====================================================
-- CORREÇÕES COMPLETAS DE SEGURANÇA RLS
-- =====================================================

-- =====================================================
-- 1. PERFIS (PROFILES) - Corrigir políticas de segurança
-- =====================================================

-- Remover políticas existentes perigosas
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Políticas seguras para perfis
CREATE POLICY "authenticated_users_can_view_own_profile" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "authenticated_users_can_update_own_profile" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "authenticated_users_can_insert_own_profile" ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Nota: DELETE removido intencionalmente para segurança

-- =====================================================
-- 2. CATEGORIAS - Corrigir autenticação
-- =====================================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can delete own categories" ON public.categorias;
DROP POLICY IF EXISTS "Users can insert own categories" ON public.categorias;
DROP POLICY IF EXISTS "Users can update own categories" ON public.categorias;
DROP POLICY IF EXISTS "Users can view own categories" ON public.categorias;

-- Políticas seguras para categorias
CREATE POLICY "authenticated_users_can_view_own_categories" ON public.categorias
    FOR SELECT
    TO authenticated
    USING (auth.uid() = userid);

CREATE POLICY "authenticated_users_can_insert_own_categories" ON public.categorias
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = userid);

CREATE POLICY "authenticated_users_can_update_own_categories" ON public.categorias
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = userid)
    WITH CHECK (auth.uid() = userid);

CREATE POLICY "authenticated_users_can_delete_own_categories" ON public.categorias
    FOR DELETE
    TO authenticated
    USING (auth.uid() = userid);

-- =====================================================
-- 3. TRANSAÇÕES - Corrigir autenticação e validações
-- =====================================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transacoes;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transacoes;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transacoes;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transacoes;

-- Políticas seguras para transações
CREATE POLICY "authenticated_users_can_view_own_transactions" ON public.transacoes
    FOR SELECT
    TO authenticated
    USING (auth.uid() = userid);

CREATE POLICY "authenticated_users_can_insert_own_transactions" ON public.transacoes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = userid AND
        user_owns_category(category_id)
    );

CREATE POLICY "authenticated_users_can_update_own_transactions" ON public.transacoes
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = userid)
    WITH CHECK (
        auth.uid() = userid AND
        user_owns_category(category_id)
    );

CREATE POLICY "authenticated_users_can_delete_own_transactions" ON public.transacoes
    FOR DELETE
    TO authenticated
    USING (auth.uid() = userid);

-- =====================================================
-- 4. LEMBRETES - Corrigir autenticação
-- =====================================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can delete own reminders" ON public.lembretes;
DROP POLICY IF EXISTS "Users can insert own reminders" ON public.lembretes;
DROP POLICY IF EXISTS "Users can update own reminders" ON public.lembretes;
DROP POLICY IF EXISTS "Users can view own reminders" ON public.lembretes;

-- Políticas seguras para lembretes
CREATE POLICY "authenticated_users_can_view_own_reminders" ON public.lembretes
    FOR SELECT
    TO authenticated
    USING (auth.uid() = userid);

CREATE POLICY "authenticated_users_can_insert_own_reminders" ON public.lembretes
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = userid);

CREATE POLICY "authenticated_users_can_update_own_reminders" ON public.lembretes
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = userid)
    WITH CHECK (auth.uid() = userid);

CREATE POLICY "authenticated_users_can_delete_own_reminders" ON public.lembretes
    FOR DELETE
    TO authenticated
    USING (auth.uid() = userid);

-- =====================================================
-- 5. VERIFICAÇÕES DE TELEFONE - Corrigir autenticação
-- =====================================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can delete their own phone verifications" ON public.phone_verifications;
DROP POLICY IF EXISTS "Users can insert their own phone verifications" ON public.phone_verifications;
DROP POLICY IF EXISTS "Users can update their own phone verifications" ON public.phone_verifications;
DROP POLICY IF EXISTS "Users can view their own phone verifications" ON public.phone_verifications;
DROP POLICY IF EXISTS "service_role_can_manage_phone_verifications" ON public.phone_verifications;

-- Políticas seguras para verificações de telefone
CREATE POLICY "authenticated_users_can_view_own_phone_verifications" ON public.phone_verifications
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_insert_own_phone_verifications" ON public.phone_verifications
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_update_own_phone_verifications" ON public.phone_verifications
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_delete_own_phone_verifications" ON public.phone_verifications
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Service role para webhooks
CREATE POLICY "service_role_can_manage_phone_verifications" ON public.phone_verifications
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- 6. ASSINATURAS - Corrigir políticas
-- =====================================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "admins_can_view_all_subscriptions" ON public.subscriptions;

-- Políticas seguras para assinaturas
CREATE POLICY "authenticated_users_can_view_own_subscriptions" ON public.subscriptions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_insert_own_subscriptions" ON public.subscriptions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_update_own_subscriptions" ON public.subscriptions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service role para webhooks de pagamento
CREATE POLICY "service_role_can_manage_subscriptions" ON public.subscriptions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Admins podem visualizar todas as assinaturas
CREATE POLICY "admins_can_view_all_subscriptions" ON public.subscriptions
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- =====================================================
-- 7. AUDITORIA DO SISTEMA - Tornar somente leitura
-- =====================================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "admins_can_view_system_audit" ON public.system_audit;
DROP POLICY IF EXISTS "system_can_insert_audit_logs" ON public.system_audit;

-- Sistema pode inserir logs automaticamente
CREATE POLICY "system_can_insert_audit_logs" ON public.system_audit
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Service role pode inserir logs
CREATE POLICY "service_role_can_insert_audit_logs" ON public.system_audit
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Apenas admins podem visualizar logs
CREATE POLICY "admins_can_view_system_audit" ON public.system_audit
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- =====================================================
-- 8. CONFIGURAÇÃO DO SISTEMA - Corrigir políticas
-- =====================================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "admins_can_manage_system_config" ON public.system_config;
DROP POLICY IF EXISTS "authenticated_users_can_read_public_config" ON public.system_config;

-- Usuários autenticados podem ler configurações públicas
CREATE POLICY "authenticated_users_can_read_public_config" ON public.system_config
    FOR SELECT
    TO authenticated
    USING (is_public = true);

-- Apenas admins podem gerenciar configurações
CREATE POLICY "admins_can_manage_system_config" ON public.system_config
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());