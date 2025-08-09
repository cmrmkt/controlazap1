-- Etapa 1: Corrigir Foreign Keys para CASCADE (resolve problema de exclusão)
ALTER TABLE public.categorias DROP CONSTRAINT IF EXISTS categorias_userid_fkey;
ALTER TABLE public.categorias 
ADD CONSTRAINT categorias_userid_fkey 
FOREIGN KEY (userid) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.lembretes DROP CONSTRAINT IF EXISTS lembretes_userid_fkey;
ALTER TABLE public.lembretes 
ADD CONSTRAINT lembretes_userid_fkey 
FOREIGN KEY (userid) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.transacoes DROP CONSTRAINT IF EXISTS transacoes_userid_fkey;
ALTER TABLE public.transacoes 
ADD CONSTRAINT transacoes_userid_fkey 
FOREIGN KEY (userid) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.user_goals DROP CONSTRAINT IF EXISTS user_goals_user_id_fkey;
ALTER TABLE public.user_goals 
ADD CONSTRAINT user_goals_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Etapa 2: Consolidar dados do usuário duplicado (se existir)
DO $$
DECLARE
    duplicate_user_id UUID := 'f1a91b66-62c1-4385-aac3-941f32d1cfc3';
    main_user_id UUID := '24c11d49-12ef-4307-aa1d-0497ef4e4185';
BEGIN
    -- Verificar se os usuários existem
    IF EXISTS (SELECT 1 FROM profiles WHERE id = duplicate_user_id) AND 
       EXISTS (SELECT 1 FROM profiles WHERE id = main_user_id) THEN
       
        -- Transferir categorias
        UPDATE categorias SET userid = main_user_id 
        WHERE userid = duplicate_user_id;
        
        -- Transferir transações
        UPDATE transacoes SET userid = main_user_id 
        WHERE userid = duplicate_user_id;
        
        -- Transferir lembretes
        UPDATE lembretes SET userid = main_user_id 
        WHERE userid = duplicate_user_id;
        
        -- Transferir goals
        UPDATE user_goals SET user_id = main_user_id 
        WHERE user_id = duplicate_user_id;
        
        -- Transferir subscriptions
        UPDATE subscriptions SET user_id = main_user_id 
        WHERE user_id = duplicate_user_id;
        
        -- Atualizar perfil principal com telefone normalizado
        UPDATE profiles 
        SET whatsapp = '+5511950608439',
            phone = '+5511950608439',
            updated_at = now()
        WHERE id = main_user_id;
        
        -- Deletar usuário duplicado
        DELETE FROM profiles WHERE id = duplicate_user_id;
        
        RAISE NOTICE 'Usuário duplicado consolidado com sucesso';
    END IF;
END $$;

-- Etapa 3: Configurar Realtime completo
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.transacoes REPLICA IDENTITY FULL;
ALTER TABLE public.lembretes REPLICA IDENTITY FULL;
ALTER TABLE public.categorias REPLICA IDENTITY FULL;
ALTER TABLE public.subscriptions REPLICA IDENTITY FULL;
ALTER TABLE public.user_goals REPLICA IDENTITY FULL;

-- Adicionar tabelas à publicação realtime (se não estiverem)
DO $$
BEGIN
    -- Adicionar categorias se não estiver na publicação
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'categorias'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE categorias;
    END IF;
    
    -- Adicionar subscriptions se não estiver na publicação
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'subscriptions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;
    END IF;
END $$;

-- Etapa 4: Criar função de health check para N8N
CREATE OR REPLACE FUNCTION public.check_n8n_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    recent_transactions_count INTEGER;
    recent_reminders_count INTEGER;
    last_update TIMESTAMP;
    health_status jsonb;
BEGIN
    -- Verificar transações recentes (últimas 24h)
    SELECT COUNT(*) INTO recent_transactions_count
    FROM transacoes 
    WHERE created_at > now() - interval '24 hours';
    
    -- Verificar lembretes recentes (últimas 24h)
    SELECT COUNT(*) INTO recent_reminders_count
    FROM lembretes 
    WHERE created_at > now() - interval '24 hours';
    
    -- Verificar última atualização de perfil
    SELECT MAX(updated_at) INTO last_update
    FROM profiles;
    
    -- Construir status de saúde
    health_status := jsonb_build_object(
        'status', CASE 
            WHEN last_update > now() - interval '1 hour' THEN 'healthy'
            WHEN last_update > now() - interval '6 hours' THEN 'warning'
            ELSE 'error'
        END,
        'last_sync', last_update,
        'recent_transactions', recent_transactions_count,
        'recent_reminders', recent_reminders_count,
        'timestamp', now()
    );
    
    RETURN health_status;
END;
$$;

-- Etapa 5: Otimizar função de normalização de telefone
CREATE OR REPLACE FUNCTION public.normalize_phone_number(phone_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF phone_input IS NULL OR trim(phone_input) = '' THEN
        RETURN NULL;
    END IF;
    
    -- Remove todos os caracteres não numéricos
    phone_input := regexp_replace(phone_input, '[^\d]', '', 'g');
    
    -- Se já está no formato correto com +55
    IF phone_input ~ '^\+?5511\d{9}$' THEN
        RETURN '+' || regexp_replace(phone_input, '^\+?', '');
    END IF;
    
    -- Se começar com 5511 e tem 13 dígitos
    IF length(phone_input) = 13 AND phone_input LIKE '5511%' THEN
        RETURN '+' || phone_input;
    END IF;
    
    -- Se começar com 55 e tem 13 dígitos
    IF length(phone_input) = 13 AND phone_input LIKE '55%' THEN
        RETURN '+' || phone_input;
    END IF;
    
    -- Se tem 11 dígitos e começa com 11
    IF length(phone_input) = 11 AND phone_input LIKE '11%' THEN
        RETURN '+55' || phone_input;
    END IF;
    
    -- Se tem 9 dígitos (número celular sem DDD)
    IF length(phone_input) = 9 AND phone_input ~ '^\d{9}$' THEN
        RETURN '+5511' || phone_input;
    END IF;
    
    -- Se tem 8 dígitos (número fixo sem DDD)
    IF length(phone_input) = 8 AND phone_input ~ '^\d{8}$' THEN
        RETURN '+5511' || phone_input;
    END IF;
    
    -- Retorna original se não conseguir normalizar
    RETURN '+' || phone_input;
END;
$$;

-- Etapa 6: Melhorar função find_user_by_whatsapp
CREATE OR REPLACE FUNCTION public.find_user_by_whatsapp(phone_input text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    user_id UUID;
    normalized_phone TEXT;
    search_patterns TEXT[];
    pattern TEXT;
BEGIN
    -- Normalizar o telefone de entrada
    normalized_phone := normalize_phone_number(phone_input);
    
    -- Criar variações para busca
    search_patterns := ARRAY[
        normalized_phone,
        regexp_replace(normalized_phone, '^\+', ''),
        regexp_replace(normalized_phone, '^\+55', ''),
        regexp_replace(normalized_phone, '^\+5511', '')
    ];
    
    -- Tentar encontrar por whatsapp com qualquer variação
    FOREACH pattern IN ARRAY search_patterns
    LOOP
        SELECT id INTO user_id
        FROM profiles 
        WHERE normalize_phone_number(whatsapp) = pattern
           OR normalize_phone_number(phone) = pattern
           OR whatsapp = pattern
           OR phone = pattern
        LIMIT 1;
        
        IF user_id IS NOT NULL THEN
            RETURN user_id;
        END IF;
    END LOOP;
    
    RETURN NULL;
END;
$$;