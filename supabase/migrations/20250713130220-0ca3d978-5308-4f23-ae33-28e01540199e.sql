-- Consolidar usuários duplicados e configurar realtime
-- Etapa 1: Consolidar dados do usuário duplicado
DO $$
DECLARE
    main_user_id UUID := '24c11d49-12ef-4307-aa1d-0497ef4e4185';
    duplicate_user_id UUID := 'c3f59f6f-2c6b-47ae-ae4a-e09b9beb10ed';
BEGIN
    -- Transferir transações do usuário duplicado para o principal
    UPDATE transacoes 
    SET userid = main_user_id 
    WHERE userid = duplicate_user_id;
    
    -- Transferir lembretes do usuário duplicado para o principal
    UPDATE lembretes 
    SET userid = main_user_id 
    WHERE userid = duplicate_user_id;
    
    -- Transferir categorias do usuário duplicado para o principal
    UPDATE categorias 
    SET userid = main_user_id 
    WHERE userid = duplicate_user_id;
    
    -- Transferir metas do usuário duplicado para o principal
    UPDATE user_goals 
    SET user_id = main_user_id 
    WHERE user_id = duplicate_user_id;
    
    -- Atualizar o perfil principal com WhatsApp normalizado
    UPDATE profiles 
    SET whatsapp = '+5511950608439',
        phone = '+5511950608439',
        updated_at = NOW()
    WHERE id = main_user_id;
    
    -- Remover perfil duplicado
    DELETE FROM profiles WHERE id = duplicate_user_id;
    
    RAISE NOTICE 'Usuários consolidados com sucesso';
END $$;

-- Etapa 2: Configurar REPLICA IDENTITY FULL para realtime
ALTER TABLE profiles REPLICA IDENTITY FULL;
ALTER TABLE transacoes REPLICA IDENTITY FULL;
ALTER TABLE lembretes REPLICA IDENTITY FULL;
ALTER TABLE categorias REPLICA IDENTITY FULL;
ALTER TABLE subscriptions REPLICA IDENTITY FULL;
ALTER TABLE user_goals REPLICA IDENTITY FULL;

-- Etapa 3: Criar função para normalizar números de telefone
CREATE OR REPLACE FUNCTION normalize_phone_number(phone_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF phone_input IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Remove todos os caracteres não numéricos
    phone_input := regexp_replace(phone_input, '[^\d]', '', 'g');
    
    -- Se começar com 55 e tem 13 dígitos, adiciona +
    IF length(phone_input) = 13 AND phone_input LIKE '55%' THEN
        RETURN '+' || phone_input;
    END IF;
    
    -- Se começar com 5511 e tem 13 dígitos, adiciona +
    IF length(phone_input) = 13 AND phone_input LIKE '5511%' THEN
        RETURN '+' || phone_input;
    END IF;
    
    -- Se tem 11 dígitos e começa com 11, adiciona +55
    IF length(phone_input) = 11 AND phone_input LIKE '11%' THEN
        RETURN '+55' || phone_input;
    END IF;
    
    -- Se tem 9 dígitos, adiciona +5511
    IF length(phone_input) = 9 THEN
        RETURN '+5511' || phone_input;
    END IF;
    
    -- Retorna como veio se não conseguir normalizar
    RETURN phone_input;
END;
$$;

-- Etapa 4: Criar função para encontrar usuário por WhatsApp normalizado
CREATE OR REPLACE FUNCTION find_user_by_whatsapp(phone_input TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    user_id UUID;
    normalized_phone TEXT;
BEGIN
    normalized_phone := normalize_phone_number(phone_input);
    
    -- Tentar encontrar por whatsapp normalizado
    SELECT id INTO user_id
    FROM profiles 
    WHERE normalize_phone_number(whatsapp) = normalized_phone
    LIMIT 1;
    
    -- Se não encontrar, tentar por phone normalizado
    IF user_id IS NULL THEN
        SELECT id INTO user_id
        FROM profiles 
        WHERE normalize_phone_number(phone) = normalized_phone
        LIMIT 1;
    END IF;
    
    RETURN user_id;
END;
$$;