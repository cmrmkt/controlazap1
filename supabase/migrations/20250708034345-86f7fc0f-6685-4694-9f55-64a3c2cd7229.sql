-- =====================================================
-- FUNÇÃO PARA CRIAR USUÁRIO COMPLETO VIA WEBHOOK
-- =====================================================

-- Função para criar usuário com perfil completo via webhook
CREATE OR REPLACE FUNCTION public.create_user_from_webhook(
  user_email text,
  user_phone text DEFAULT NULL,
  user_name text DEFAULT NULL,
  user_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
  profile_data jsonb;
BEGIN
  -- Gerar um novo UUID para o usuário
  new_user_id := gen_random_uuid();
  
  -- Verificar se já existe um perfil com este email
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = user_email) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Email já existe',
      'user_id', null
    );
  END IF;
  
  -- Verificar se já existe um perfil com este telefone (se fornecido)
  IF user_phone IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE phone = user_phone) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Telefone já existe',
      'user_id', null
    );
  END IF;
  
  -- Criar o perfil diretamente na tabela profiles
  INSERT INTO public.profiles (
    id,
    nome,
    email,
    phone,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    COALESCE(user_name, user_metadata->>'name', split_part(user_email, '@', 1)),
    user_email,
    user_phone,
    now(),
    now()
  );
  
  -- Se telefone foi fornecido, criar verificação automática
  IF user_phone IS NOT NULL THEN
    INSERT INTO public.phone_verifications (
      user_id,
      phone,
      verification_code,
      verified,
      expires_at,
      created_at,
      updated_at
    ) VALUES (
      new_user_id,
      user_phone,
      'webhook_verified',
      true,
      now() + interval '1 year',
      now(),
      now()
    );
  END IF;
  
  -- Retornar sucesso com dados do usuário
  RETURN jsonb_build_object(
    'success', true,
    'user_id', new_user_id,
    'email', user_email,
    'phone', user_phone,
    'name', COALESCE(user_name, split_part(user_email, '@', 1))
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, retornar detalhes
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'user_id', null
    );
END;
$$;

-- Função para buscar ou criar usuário baseado em email/telefone
CREATE OR REPLACE FUNCTION public.find_or_create_user_by_contact(
  contact_info text,
  contact_type text DEFAULT 'email', -- 'email' ou 'phone'
  user_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  existing_profile public.profiles%ROWTYPE;
  result jsonb;
BEGIN
  -- Buscar usuário existente
  IF contact_type = 'email' THEN
    SELECT * INTO existing_profile 
    FROM public.profiles 
    WHERE email = contact_info 
    LIMIT 1;
  ELSIF contact_type = 'phone' THEN
    SELECT * INTO existing_profile 
    FROM public.profiles 
    WHERE phone = contact_info 
    LIMIT 1;
  END IF;
  
  -- Se usuário existe, retornar dados
  IF existing_profile.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'found', true,
      'user_id', existing_profile.id,
      'email', existing_profile.email,
      'phone', existing_profile.phone,
      'name', existing_profile.nome
    );
  END IF;
  
  -- Se não existe, criar novo usuário
  IF contact_type = 'email' THEN
    SELECT public.create_user_from_webhook(
      contact_info,
      NULL,
      user_name
    ) INTO result;
  ELSIF contact_type = 'phone' THEN
    -- Para telefone, criar email temporário
    SELECT public.create_user_from_webhook(
      contact_info || '@temp.webhook.com',
      contact_info,
      user_name
    ) INTO result;
  END IF;
  
  -- Adicionar flag de que foi criado
  result := result || jsonb_build_object('found', false);
  
  RETURN result;
END;
$$;

-- Comentários para documentação
COMMENT ON FUNCTION public.create_user_from_webhook(text, text, text, jsonb) IS 'Cria usuário completo com perfil via webhook sem passar pelo Supabase Auth';
COMMENT ON FUNCTION public.find_or_create_user_by_contact(text, text, text) IS 'Busca usuário existente ou cria novo baseado em email/telefone';