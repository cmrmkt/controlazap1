-- =====================================================
-- OTIMIZAÇÃO COMPLETA DAS POLÍTICAS RLS
-- =====================================================

-- Garantir que RLS está habilitada em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lembretes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FUNÇÃO AUXILIAR PARA VERIFICAR SE USUÁRIO É ADMIN
-- =====================================================

-- Criar função segura para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path TO ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (
            email LIKE '%@admin.%' OR 
            email IN ('admin@poupae.online', 'suporte@poupae.online')
        )
    );
$$;

-- =====================================================
-- 1. PERFIS (PROFILES) - Acesso individual seguro
-- =====================================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- Política para visualizar apenas próprio perfil ou admin visualizar todos
CREATE POLICY "users_can_view_profiles" ON public.profiles
    FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

-- Política para atualizar apenas próprio perfil
CREATE POLICY "users_can_update_own_profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Política para inserir próprio perfil (necessário para registro)
CREATE POLICY "users_can_insert_own_profile" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Não permitir DELETE de perfis para preservar integridade dos dados
-- Admins podem desativar perfis através do campo 'ativo'

-- =====================================================
-- 2. CATEGORIAS - Acesso individual seguro
-- =====================================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can view own categories" ON public.categorias;
DROP POLICY IF EXISTS "Users can insert own categories" ON public.categorias;
DROP POLICY IF EXISTS "Users can update own categories" ON public.categorias;
DROP POLICY IF EXISTS "Users can delete own categories" ON public.categorias;

-- Políticas granulares para categorias
CREATE POLICY "users_can_view_own_categories" ON public.categorias
    FOR SELECT
    USING (auth.uid() = userid OR public.is_admin());

CREATE POLICY "users_can_insert_own_categories" ON public.categorias
    FOR INSERT
    WITH CHECK (auth.uid() = userid);

CREATE POLICY "users_can_update_own_categories" ON public.categorias
    FOR UPDATE
    USING (auth.uid() = userid)
    WITH CHECK (auth.uid() = userid);

CREATE POLICY "users_can_delete_own_categories" ON public.categorias
    FOR DELETE
    USING (auth.uid() = userid OR public.is_admin());

-- =====================================================
-- 3. TRANSAÇÕES - Acesso individual seguro
-- =====================================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transacoes;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transacoes;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transacoes;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transacoes;

-- Políticas granulares para transações
CREATE POLICY "users_can_view_own_transactions" ON public.transacoes
    FOR SELECT
    USING (auth.uid() = userid OR public.is_admin());

CREATE POLICY "users_can_insert_own_transactions" ON public.transacoes
    FOR INSERT
    WITH CHECK (auth.uid() = userid AND public.user_owns_category(category_id));

CREATE POLICY "users_can_update_own_transactions" ON public.transacoes
    FOR UPDATE
    USING (auth.uid() = userid)
    WITH CHECK (auth.uid() = userid AND public.user_owns_category(category_id));

CREATE POLICY "users_can_delete_own_transactions" ON public.transacoes
    FOR DELETE
    USING (auth.uid() = userid OR public.is_admin());

-- =====================================================
-- 4. LEMBRETES - Acesso individual seguro
-- =====================================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can view own reminders" ON public.lembretes;
DROP POLICY IF EXISTS "Users can insert own reminders" ON public.lembretes;
DROP POLICY IF EXISTS "Users can update own reminders" ON public.lembretes;
DROP POLICY IF EXISTS "Users can delete own reminders" ON public.lembretes;

-- Políticas granulares para lembretes
CREATE POLICY "users_can_view_own_reminders" ON public.lembretes
    FOR SELECT
    USING (auth.uid() = userid OR public.is_admin());

CREATE POLICY "users_can_insert_own_reminders" ON public.lembretes
    FOR INSERT
    WITH CHECK (auth.uid() = userid);

CREATE POLICY "users_can_update_own_reminders" ON public.lembretes
    FOR UPDATE
    USING (auth.uid() = userid)
    WITH CHECK (auth.uid() = userid);

CREATE POLICY "users_can_delete_own_reminders" ON public.lembretes
    FOR DELETE
    USING (auth.uid() = userid OR public.is_admin());

-- =====================================================
-- 5. VERIFICAÇÕES DE TELEFONE - Políticas granulares
-- =====================================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can manage their own phone verifications" ON public.phone_verifications;
DROP POLICY IF EXISTS "Service role can manage phone verifications" ON public.phone_verifications;

-- Políticas específicas para verificações de telefone
CREATE POLICY "users_can_view_own_phone_verifications" ON public.phone_verifications
    FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "users_can_insert_own_phone_verifications" ON public.phone_verifications
    FOR INSERT
    WITH CHECK (auth.uid() = user_id AND expires_at > now());

CREATE POLICY "users_can_update_own_phone_verifications" ON public.phone_verifications
    FOR UPDATE
    USING (auth.uid() = user_id AND expires_at > now())
    WITH CHECK (auth.uid() = user_id);

-- Service role precisa acessar para webhook/API externa
CREATE POLICY "service_role_phone_verifications" ON public.phone_verifications
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Não permitir DELETE para manter histórico de verificações

-- =====================================================
-- 6. ASSINATURAS - Controle individual + service role
-- =====================================================

-- Remover políticas existentes conflitantes
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;

-- Políticas refinadas para assinaturas
CREATE POLICY "users_can_view_own_subscription" ON public.subscriptions
    FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "users_can_insert_own_subscription" ON public.subscriptions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Apenas service role pode atualizar assinaturas (webhook de pagamento)
CREATE POLICY "service_role_can_manage_subscriptions" ON public.subscriptions
    FOR ALL
    USING (auth.role() = 'service_role' OR public.is_admin())
    WITH CHECK (auth.role() = 'service_role' OR public.is_admin());

-- Não permitir DELETE de assinaturas para preservar histórico

-- =====================================================
-- 7. FUNÇÕES DE VALIDAÇÃO MELHORADAS
-- =====================================================

-- Melhorar função user_owns_category para ser mais segura
CREATE OR REPLACE FUNCTION public.user_owns_category(category_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.categorias
        WHERE id = category_uuid 
        AND userid = auth.uid()
    );
$$;

-- =====================================================
-- 8. GRANTS E PERMISSÕES
-- =====================================================

-- Garantir que service role pode executar funções necessárias
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- =====================================================
-- 9. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION public.is_admin() IS 'Verifica se o usuário atual é administrador baseado no email';
COMMENT ON FUNCTION public.user_owns_category(UUID) IS 'Verifica se o usuário atual é dono da categoria especificada';

-- Comentários nas políticas principais
COMMENT ON POLICY "users_can_view_profiles" ON public.profiles IS 'Usuários podem ver próprio perfil, admins podem ver todos';
COMMENT ON POLICY "users_can_view_own_categories" ON public.categorias IS 'Usuários podem ver apenas suas categorias, admins podem ver todas';
COMMENT ON POLICY "users_can_view_own_transactions" ON public.transacoes IS 'Usuários podem ver apenas suas transações, admins podem ver todas';
COMMENT ON POLICY "users_can_view_own_reminders" ON public.lembretes IS 'Usuários podem ver apenas seus lembretes, admins podem ver todos';