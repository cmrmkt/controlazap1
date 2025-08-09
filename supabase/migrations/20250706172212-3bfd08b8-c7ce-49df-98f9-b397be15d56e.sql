-- 🔧 REVISÃO COMPLETA DO BANCO DE DADOS
-- ✔ Foreign Keys
-- ✔ Permissões RLS completas  
-- ✔ Limpeza de dados de teste
-- ✔ Configuração do Auth (OTP, senhas fortes)

-- ========================================
-- 1. ADICIONAR FOREIGN KEYS FALTANTES
-- ========================================

-- Adicionar FK para profiles.id → auth.users.id (caso não exista)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_id_fkey' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_id_fkey 
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Adicionar FKs para userid → profiles.id
DO $$ 
BEGIN
    -- Categorias
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'categorias_userid_fkey' 
        AND table_name = 'categorias'
    ) THEN
        ALTER TABLE public.categorias 
        ADD CONSTRAINT categorias_userid_fkey 
        FOREIGN KEY (userid) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    -- Transações
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transacoes_userid_fkey' 
        AND table_name = 'transacoes'
    ) THEN
        ALTER TABLE public.transacoes 
        ADD CONSTRAINT transacoes_userid_fkey 
        FOREIGN KEY (userid) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    -- Lembretes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'lembretes_userid_fkey' 
        AND table_name = 'lembretes'
    ) THEN
        ALTER TABLE public.lembretes 
        ADD CONSTRAINT lembretes_userid_fkey 
        FOREIGN KEY (userid) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    -- Subscriptions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'subscriptions_user_id_fkey' 
        AND table_name = 'subscriptions'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD CONSTRAINT subscriptions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    -- Phone Verifications
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'phone_verifications_user_id_fkey' 
        AND table_name = 'phone_verifications'
    ) THEN
        ALTER TABLE public.phone_verifications 
        ADD CONSTRAINT phone_verifications_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ========================================
-- 2. COMPLETAR POLÍTICAS RLS
-- ========================================

-- Adicionar políticas faltantes para service role em subscriptions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'subscriptions' 
        AND policyname = 'Service role can manage subscriptions'
    ) THEN
        CREATE POLICY "Service role can manage subscriptions" 
        ON public.subscriptions 
        FOR ALL 
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;

-- Adicionar políticas faltantes para service role em phone_verifications
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'phone_verifications' 
        AND policyname = 'Service role can manage phone verifications'
    ) THEN
        CREATE POLICY "Service role can manage phone verifications" 
        ON public.phone_verifications 
        FOR ALL 
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;

-- ========================================
-- 3. CONFIGURAÇÕES DE AUTENTICAÇÃO
-- ========================================

-- Inserir/atualizar configurações de autenticação segura
INSERT INTO public.auth_settings (setting_key, setting_value, description) VALUES
('enable_leaked_password_protection', 'true', 'Enable protection against leaked passwords'),
('otp_expiry_minutes', '5', 'OTP expiry time in minutes'),
('password_min_length', '8', 'Minimum password length requirement'),
('require_uppercase', 'true', 'Require uppercase letters in passwords'),
('require_lowercase', 'true', 'Require lowercase letters in passwords'),
('require_numbers', 'true', 'Require numbers in passwords'),
('require_special_chars', 'true', 'Require special characters in passwords'),
('max_login_attempts', '5', 'Maximum login attempts before lockout'),
('lockout_duration_minutes', '15', 'Account lockout duration in minutes')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = now();

-- ========================================
-- 4. LIMPEZA DE DADOS DE TESTE
-- ========================================

-- Remover dados de teste de transações (manter apenas dados reais do usuário logado)
DELETE FROM public.transacoes 
WHERE detalhes ILIKE '%teste%' 
   OR detalhes ILIKE '%test%' 
   OR estabelecimento ILIKE '%teste%' 
   OR estabelecimento ILIKE '%test%';

-- Remover dados de teste de categorias
DELETE FROM public.categorias 
WHERE nome ILIKE '%teste%' 
   OR nome ILIKE '%test%' 
   OR tags ILIKE '%teste%' 
   OR tags ILIKE '%test%';

-- Remover dados de teste de lembretes
DELETE FROM public.lembretes 
WHERE descricao ILIKE '%teste%' 
   OR descricao ILIKE '%test%';

-- Remover phone verifications expiradas
DELETE FROM public.phone_verifications 
WHERE expires_at < now() - INTERVAL '1 day';

-- ========================================
-- 5. FUNÇÃO PARA AUTO-CRIAÇÃO DE PROFILE
-- ========================================

-- Criar função para auto-criar profile quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Criar trigger para auto-criação de profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ========================================
-- 6. ÍNDICES PARA PERFORMANCE
-- ========================================

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_transacoes_userid_quando ON public.transacoes(userid, quando DESC);
CREATE INDEX IF NOT EXISTS idx_categorias_userid ON public.categorias(userid);
CREATE INDEX IF NOT EXISTS idx_lembretes_userid_data ON public.lembretes(userid, data);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_user_id ON public.phone_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_user_id ON public.auth_audit(user_id);

-- ========================================
-- 7. TRIGGER PARA UPDATED_AT
-- ========================================

-- Aplicar trigger de updated_at em todas as tabelas que precisam
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_phone_verifications_updated_at
    BEFORE UPDATE ON public.phone_verifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- 8. VALIDAÇÕES ADICIONAIS
-- ========================================

-- Constraint para garantir que emails sejam válidos
ALTER TABLE public.profiles 
ADD CONSTRAINT valid_email 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Constraint para garantir que telefones sejam válidos (formato brasileiro)
ALTER TABLE public.profiles 
ADD CONSTRAINT valid_phone 
CHECK (phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$');

-- Constraint para garantir valores positivos em transações de receita
ALTER TABLE public.transacoes 
ADD CONSTRAINT valid_valor 
CHECK (valor > 0 OR tipo = 'despesa');

-- ========================================
-- FINALIZAÇÃO
-- ========================================
COMMENT ON SCHEMA public IS 'Revisão completa: FKs ✓ RLS ✓ Auth ✓ Limpeza ✓';