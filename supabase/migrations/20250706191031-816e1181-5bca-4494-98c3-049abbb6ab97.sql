-- =====================================================
-- CONFIGURAÇÃO COMPLETA DE RLS PARA TODAS AS TABELAS
-- =====================================================

-- Garantir que RLS está habilitada em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lembretes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_config ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PERFIS (PROFILES) - Acesso individual seguro
-- =====================================================

-- Remover políticas existentes para recriar
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Política para visualizar apenas próprio perfil
CREATE POLICY "users_can_view_own_profile" ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Política para atualizar apenas próprio perfil
CREATE POLICY "users_can_update_own_profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Política para inserir próprio perfil (necessário para registro)
CREATE POLICY "users_can_insert_own_profile" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- =====================================================
-- CATEGORIAS - Acesso individual seguro
-- =====================================================

-- Remover políticas existentes para recriar
DROP POLICY IF EXISTS "Users can view their own categories" ON public.categorias;
DROP POLICY IF EXISTS "Users can create their own categories" ON public.categorias;
DROP POLICY IF EXISTS "Users can update their own categories" ON public.categorias;
DROP POLICY IF EXISTS "Users can delete their own categories" ON public.categorias;

-- Políticas para categorias (apenas dados do próprio usuário)
CREATE POLICY "users_can_view_own_categories" ON public.categorias
    FOR SELECT
    USING (auth.uid() = userid);

CREATE POLICY "users_can_insert_own_categories" ON public.categorias
    FOR INSERT
    WITH CHECK (auth.uid() = userid);

CREATE POLICY "users_can_update_own_categories" ON public.categorias
    FOR UPDATE
    USING (auth.uid() = userid)
    WITH CHECK (auth.uid() = userid);

CREATE POLICY "users_can_delete_own_categories" ON public.categorias
    FOR DELETE
    USING (auth.uid() = userid);

-- =====================================================
-- TRANSAÇÕES - Acesso individual seguro
-- =====================================================

-- Remover políticas existentes para recriar
DROP POLICY IF EXISTS "Apenas dados do próprio usuário" ON public.transacoes;
DROP POLICY IF EXISTS "Inserir dados do próprio usuário" ON public.transacoes;
DROP POLICY IF EXISTS "Atualizar dados do próprio usuário" ON public.transacoes;
DROP POLICY IF EXISTS "Excluir dados do próprio usuário" ON public.transacoes;

-- Políticas para transações (apenas dados do próprio usuário)
CREATE POLICY "users_can_view_own_transactions" ON public.transacoes
    FOR SELECT
    USING (auth.uid() = userid);

CREATE POLICY "users_can_insert_own_transactions" ON public.transacoes
    FOR INSERT
    WITH CHECK (auth.uid() = userid);

CREATE POLICY "users_can_update_own_transactions" ON public.transacoes
    FOR UPDATE
    USING (auth.uid() = userid)
    WITH CHECK (auth.uid() = userid);

CREATE POLICY "users_can_delete_own_transactions" ON public.transacoes
    FOR DELETE
    USING (auth.uid() = userid);

-- =====================================================
-- LEMBRETES - Acesso individual seguro
-- =====================================================

-- Remover políticas existentes para recriar
DROP POLICY IF EXISTS "Users can view their own lembretes" ON public.lembretes;
DROP POLICY IF EXISTS "Users can create their own lembretes" ON public.lembretes;
DROP POLICY IF EXISTS "Users can update their own lembretes" ON public.lembretes;
DROP POLICY IF EXISTS "Users can delete their own lembretes" ON public.lembretes;

-- Políticas para lembretes (apenas dados do próprio usuário)
CREATE POLICY "users_can_view_own_reminders" ON public.lembretes
    FOR SELECT
    USING (auth.uid() = userid);

CREATE POLICY "users_can_insert_own_reminders" ON public.lembretes
    FOR INSERT
    WITH CHECK (auth.uid() = userid);

CREATE POLICY "users_can_update_own_reminders" ON public.lembretes
    FOR UPDATE
    USING (auth.uid() = userid)
    WITH CHECK (auth.uid() = userid);

CREATE POLICY "users_can_delete_own_reminders" ON public.lembretes
    FOR DELETE
    USING (auth.uid() = userid);

-- =====================================================
-- VERIFICAÇÕES DE TELEFONE - Acesso individual + service role
-- =====================================================

-- Remover políticas existentes para recriar
DROP POLICY IF EXISTS "Users can manage their own phone verifications" ON public.phone_verifications;
DROP POLICY IF EXISTS "Service role can manage phone verifications" ON public.phone_verifications;

-- Políticas para verificações de telefone
CREATE POLICY "users_can_manage_own_phone_verifications" ON public.phone_verifications
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service role precisa acessar para webhook/API externa
CREATE POLICY "service_role_can_manage_phone_verifications" ON public.phone_verifications
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- ASSINATURAS - Acesso individual + service role
-- =====================================================

-- Remover políticas existentes para recriar
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;

-- Políticas para assinaturas (usuário pode ver e inserir/atualizar suas próprias)
CREATE POLICY "users_can_view_own_subscription" ON public.subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_subscription" ON public.subscriptions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_subscription" ON public.subscriptions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service role para webhooks de pagamento
CREATE POLICY "service_role_can_manage_subscriptions" ON public.subscriptions
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- FUNÇÃO PARA VERIFICAR SE USUÁRIO É ADMIN
-- =====================================================

-- Criar função segura para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
    );
$$;

-- =====================================================
-- CONFIGURAÇÕES DE SISTEMA - Apenas admins
-- =====================================================

-- Remover políticas existentes para recriar
DROP POLICY IF EXISTS "Allow authenticated users to read config" ON public.config;
DROP POLICY IF EXISTS "Allow admins to modify config" ON public.config;

-- Config: Leitura para usuários autenticados, escrita para admins
CREATE POLICY "authenticated_users_can_read_config" ON public.config
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "admins_can_manage_config" ON public.config
    FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- =====================================================
-- CONFIGURAÇÕES DE SEGURANÇA - Apenas admins
-- =====================================================

-- Remover políticas existentes para recriar
DROP POLICY IF EXISTS "Only admins can manage security config" ON public.security_config;

CREATE POLICY "admins_can_manage_security_config" ON public.security_config
    FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- =====================================================
-- CONFIGURAÇÕES DE AUTENTICAÇÃO - Apenas admins
-- =====================================================

-- Remover políticas existentes para recriar
DROP POLICY IF EXISTS "Only admins can manage auth settings" ON public.auth_settings;

CREATE POLICY "admins_can_manage_auth_settings" ON public.auth_settings
    FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- =====================================================
-- AUDITORIA - Apenas admins podem visualizar
-- =====================================================

-- Remover políticas existentes para recriar
DROP POLICY IF EXISTS "Only admins can view auth audit logs" ON public.auth_audit;
DROP POLICY IF EXISTS "System can insert auth audit logs" ON public.auth_audit;
DROP POLICY IF EXISTS "Allow admins to view audit logs" ON public.config_audit;

-- Auth audit: Sistema pode inserir, admins podem visualizar
CREATE POLICY "system_can_insert_auth_audit" ON public.auth_audit
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "admins_can_view_auth_audit" ON public.auth_audit
    FOR SELECT
    USING (public.is_admin());

-- Config audit: Apenas admins podem visualizar
CREATE POLICY "admins_can_view_config_audit" ON public.config_audit
    FOR SELECT
    USING (public.is_admin());

-- =====================================================
-- GRANT NECESSÁRIOS PARA SERVICE ROLE
-- =====================================================

-- Garantir que service role pode executar funções necessárias
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION public.is_admin() IS 'Função segura para verificar se o usuário atual é administrador. Evita recursão em RLS.';

-- Comentários nas políticas principais
COMMENT ON POLICY "users_can_view_own_profile" ON public.profiles IS 'Usuários podem visualizar apenas seu próprio perfil';
COMMENT ON POLICY "users_can_view_own_categories" ON public.categorias IS 'Usuários podem visualizar apenas suas próprias categorias';
COMMENT ON POLICY "users_can_view_own_transactions" ON public.transacoes IS 'Usuários podem visualizar apenas suas próprias transações';
COMMENT ON POLICY "users_can_view_own_reminders" ON public.lembretes IS 'Usuários podem visualizar apenas seus próprios lembretes';