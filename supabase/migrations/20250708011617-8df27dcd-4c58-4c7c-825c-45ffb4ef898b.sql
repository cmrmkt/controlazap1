-- =====================================================
-- MELHORIAS NAS POLÍTICAS DE RLS E SEGURANÇA
-- =====================================================

-- 1. Adicionar coluna is_admin na tabela profiles se não existir
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Criar função segura para verificar se usuário é admin
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

-- 3. Criar tabela de auditoria para logs do sistema
CREATE TABLE IF NOT EXISTS public.system_audit (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    table_name TEXT,
    record_id TEXT,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS na tabela de auditoria
ALTER TABLE public.system_audit ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para tabela de auditoria - apenas admins podem visualizar
CREATE POLICY "admins_can_view_system_audit" ON public.system_audit
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Sistema pode inserir logs
CREATE POLICY "system_can_insert_audit_logs" ON public.system_audit
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 5. Melhorar políticas da tabela subscriptions - adicionar política admin
CREATE POLICY "admins_can_view_all_subscriptions" ON public.subscriptions
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- 6. Criar tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS public.system_config (
    id BIGSERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS na tabela de configurações
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Políticas para configurações do sistema
CREATE POLICY "authenticated_users_can_read_public_config" ON public.system_config
    FOR SELECT
    TO authenticated
    USING (is_public = true);

CREATE POLICY "admins_can_manage_system_config" ON public.system_config
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 7. Trigger para atualizar timestamp em system_config
CREATE TRIGGER update_system_config_updated_at
    BEFORE UPDATE ON public.system_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Inserir configurações básicas do sistema
INSERT INTO public.system_config (key, value, description, is_public) VALUES
('app_name', 'PoupaE', 'Nome da aplicação', true),
('app_version', '1.0.0', 'Versão da aplicação', true),
('maintenance_mode', 'false', 'Modo de manutenção', false),
('max_file_upload_size', '10485760', 'Tamanho máximo de upload (bytes)', false),
('whatsapp_integration_enabled', 'true', 'Integração WhatsApp habilitada', false)
ON CONFLICT (key) DO NOTHING;

-- 9. Função para log de auditoria
CREATE OR REPLACE FUNCTION public.log_system_audit(
    p_action TEXT,
    p_table_name TEXT DEFAULT NULL,
    p_record_id TEXT DEFAULT NULL,
    p_old_data JSONB DEFAULT NULL,
    p_new_data JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.system_audit (
        user_id,
        action,
        table_name,
        record_id,
        old_data,
        new_data
    ) VALUES (
        auth.uid(),
        p_action,
        p_table_name,
        p_record_id,
        p_old_data,
        p_new_data
    );
END;
$$;

-- 10. Função para verificar se configuração permite operação
CREATE OR REPLACE FUNCTION public.is_feature_enabled(feature_key TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT COALESCE(
        (SELECT value::boolean FROM public.system_config 
         WHERE key = feature_key AND is_public = true),
        false
    );
$$;

-- 11. Política adicional para phone_verifications - service role para WhatsApp
CREATE POLICY "service_role_can_manage_phone_verifications" ON public.phone_verifications
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 12. Comentários para documentação
COMMENT ON FUNCTION public.is_admin() IS 'Função segura para verificar se o usuário atual é administrador';
COMMENT ON FUNCTION public.log_system_audit(TEXT, TEXT, TEXT, JSONB, JSONB) IS 'Função para registrar eventos de auditoria no sistema';
COMMENT ON FUNCTION public.is_feature_enabled(TEXT) IS 'Função para verificar se uma funcionalidade está habilitada';
COMMENT ON TABLE public.system_audit IS 'Tabela de auditoria para logs do sistema - apenas admins podem visualizar';
COMMENT ON TABLE public.system_config IS 'Configurações do sistema - admins podem gerenciar, usuários podem ver configs públicas';